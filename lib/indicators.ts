import { Candle } from "@/types/psx";

export function sma(values: number[], period: number): number {
  if (values.length < period) period = values.length;
  const slice = values.slice(values.length - period);
  return slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => {
    out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k));
  });
  return out;
}

export function rsi(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(closes: number[]) {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const hist = macdLine.map((v, i) => v - signalLine[i]);
  const last = closes.length - 1;
  return {
    macd: macdLine[last] ?? 0,
    signal: signalLine[last] ?? 0,
    hist: hist[last] ?? 0,
  };
}

/** Bollinger Band width - used as the squeeze proxy (TTM-squeeze style). */
export function bollingerBandwidth(closes: number[], period = 20, mult = 2) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / (slice.length || 1);
  const stdDev = Math.sqrt(variance);
  const upper = mean + mult * stdDev;
  const lower = mean - mult * stdDev;
  return mean > 0 ? (upper - lower) / mean : 0;
}

export function avgVolume(candles: Candle[], period = 20): number {
  const slice = candles.slice(-period);
  return slice.reduce((a, c) => a + c.volume, 0) / (slice.length || 1);
}
