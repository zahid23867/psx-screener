import { Candle, DataSource, IndicatorSet, SignalType, SqueezeState, StockSnapshot } from "@/types/psx";
import { avgVolume, bollingerBandwidth, macd, rsi, sma } from "@/lib/indicators";
import { KseStock } from "@/data/kse100";
import { getFallbackCandles } from "@/lib/marketSim";
import { BoardRow, fetchHistorical, fetchTradingBoard } from "@/lib/psxClient";

// NOTE ON TIMEFRAMES: PSX's free public data only exposes daily EOD bars + the
// current session's live board (no intraday tick/OHLC history for free). True
// 1H/4H squeeze detection would require a paid intraday feed. This engine
// therefore computes real squeeze detection on the Daily timeframe only.

function computeSqueeze(candles: Candle[]): SqueezeState {
  const closes = candles.map((c) => c.close);
  const widths: number[] = [];
  for (let i = 20; i <= closes.length; i++) {
    widths.push(bollingerBandwidth(closes.slice(0, i)));
  }
  const bandwidth = widths[widths.length - 1] ?? 1;
  const prevBandwidth = widths[widths.length - 2] ?? bandwidth;
  const avgWidth = widths.slice(-30).reduce((a, b) => a + b, 0) / (widths.slice(-30).length || 1);
  const isSqueezing = bandwidth < avgWidth * 0.55;
  const wasSqueezing = prevBandwidth < avgWidth * 0.55;
  const firing = wasSqueezing && bandwidth > prevBandwidth * 1.15;
  return { timeframe: "1D", isSqueezing, bandwidth, firing };
}

function scoreFromIndicators(ind: IndicatorSet, upsidePct: number): number {
  let score = 50;

  if (ind.rsi < 30) score += 12;
  else if (ind.rsi < 45) score += 6;
  else if (ind.rsi > 75) score -= 14;
  else if (ind.rsi > 65) score -= 4;

  score += Math.max(-15, Math.min(15, ind.macdHist * 40));

  if (ind.sma20 > ind.sma50) score += 8;
  else score -= 6;

  if (ind.volumeRatio > 2) score += 14;
  else if (ind.volumeRatio > 1.5) score += 9;
  else if (ind.volumeRatio < 0.6) score -= 6;

  score += Math.max(-10, Math.min(10, ind.changePct * 1.5));
  score += Math.max(-8, Math.min(12, upsidePct * 0.3));

  return Math.max(0, Math.min(100, Math.round(score)));
}

function signalFromScore(score: number): SignalType {
  if (score >= 80) return "STRONG_BUY";
  if (score >= 62) return "BUY";
  if (score >= 40) return "NEUTRAL";
  if (score >= 22) return "SELL";
  return "STRONG_SELL";
}

function snapshotFromCandles(
  stock: KseStock,
  daily: Candle[],
  dataSource: DataSource,
  now: number
): StockSnapshot {
  const closes = daily.map((c) => c.close);
  const last = daily[daily.length - 1];
  const prev = daily[daily.length - 2] ?? last;
  const changePct = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;

  const { macd: macdVal, signal: macdSignal, hist: macdHist } = macd(closes);
  const rsiVal = rsi(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, Math.min(50, closes.length));
  const avgVol = avgVolume(daily, 20);
  const volumeRatio = avgVol > 0 ? last.volume / avgVol : 1;

  const monthly = daily.slice(-22);
  const monthHigh = Math.max(...monthly.map((c) => c.high));
  const monthLow = Math.min(...monthly.map((c) => c.low));
  const upsidePct = last.close > 0 ? ((monthHigh - last.close) / last.close) * 100 : 0;

  const indicators: IndicatorSet = {
    rsi: rsiVal,
    macd: macdVal,
    macdSignal,
    macdHist,
    sma20,
    sma50,
    volumeRatio,
    changePct,
  };

  const score = scoreFromIndicators(indicators, upsidePct);
  const signal = signalFromScore(score);
  const squeeze = [computeSqueeze(daily)];

  const breakout =
    (volumeRatio > 1.5 && changePct > 1.2 && sma20 > sma50) || squeeze.some((s) => s.firing);

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: last.close,
    prevClose: prev.close,
    changePct,
    volume: last.volume,
    avgVolume: avgVol,
    volumeRatio,
    low: last.low,
    monthLow,
    monthHigh,
    upsidePct,
    indicators,
    score,
    signal,
    squeeze,
    breakout,
    dataSource,
    updatedAt: now,
  };
}

/** Appends today's live board quote as the most recent (possibly still-forming) daily candle. */
function mergeLiveBar(history: Candle[], board: BoardRow | undefined): Candle[] {
  if (!board || board.price <= 0) return history;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const lastBar = history[history.length - 1];
  const liveBar: Candle = {
    time: todayStart,
    open: board.ldcp,
    high: Math.max(board.ldcp, board.price),
    low: Math.min(board.ldcp, board.price),
    close: board.price,
    volume: board.volume,
  };
  if (lastBar && lastBar.time >= todayStart) {
    return [...history.slice(0, -1), liveBar];
  }
  return [...history, liveBar];
}

export async function buildSnapshot(
  stock: KseStock,
  board: Map<string, BoardRow> | null,
  now: number = Date.now()
): Promise<StockSnapshot> {
  const history = await fetchHistorical(stock.symbol);

  if (!history || history.length < 10) {
    // Live PSX data unavailable for this symbol - degrade to clearly-labeled demo data.
    const candles = getFallbackCandles(stock.symbol, stock.basePrice, 40, 24 * 60 * 60_000, now);
    return snapshotFromCandles(stock, candles, "SIMULATED_FALLBACK", now);
  }

  const candles: Candle[] = history.map((h) => ({
    time: h.date,
    open: h.open,
    high: h.high,
    low: h.low,
    close: h.close,
    volume: h.volume,
  }));

  const boardRow = board?.get(stock.symbol);
  const merged = mergeLiveBar(candles, boardRow);
  const source: DataSource = boardRow ? "PSX_LIVE" : "PSX_CACHED";
  return snapshotFromCandles(stock, merged, source, now);
}

export async function buildAllSnapshots(
  stocks: KseStock[],
  now: number = Date.now()
): Promise<StockSnapshot[]> {
  const board = await fetchTradingBoard();
  // Historical fetches are internally throttled/cached in psxClient - safe to run in parallel.
  return Promise.all(stocks.map((s) => buildSnapshot(s, board, now)));
}
