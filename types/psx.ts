export type SignalType = "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";

export type TimeFrame = "1H" | "4H" | "1D";

export interface Candle {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSet {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHist: number;
  sma20: number;
  sma50: number;
  volumeRatio: number; // current volume vs avg volume
  changePct: number; // change vs previous close
}

export interface SqueezeState {
  timeframe: TimeFrame;
  isSqueezing: boolean;
  bandwidth: number; // lower = tighter squeeze
  firing: boolean; // squeeze just released (breakout)
}

export type DataSource = "PSX_LIVE" | "PSX_CACHED" | "SIMULATED_FALLBACK";

export interface StockSnapshot {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  prevClose: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  low: number;
  monthLow: number;
  monthHigh: number;
  upsidePct: number; // potential upside to month high, used for "max profit within a month" ranking
  indicators: IndicatorSet;
  score: number; // 0-100 composite
  signal: SignalType;
  squeeze: SqueezeState[];
  breakout: boolean;
  dataSource: DataSource;
  updatedAt: number;
}

export interface AlertEvent {
  id: string;
  symbol: string;
  name: string;
  type: "BREAKOUT" | "SIGNAL_CHANGE" | "SQUEEZE_FIRE" | "SCORE_THRESHOLD";
  signal: SignalType;
  score: number;
  message: string;
  price: number;
  changePct: number;
  time: number;
}
