import { Candle } from "@/types/psx";

// --- Deterministic pseudo-random fallback engine ----------------------------------------
// Used ONLY when the live PSX fetch fails (network issue, PSX site down, parser drift) so
// the app degrades gracefully instead of crashing. Every snapshot built from this path is
// tagged dataSource: "SIMULATED_FALLBACK" and the UI must surface that clearly - never
// silently pass simulated numbers off as real PSX data.

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getFallbackCandles(
  symbol: string,
  basePrice: number,
  count: number,
  intervalMs: number,
  now: number = Date.now()
): Candle[] {
  const seed = hashSeed(symbol);
  const rand = mulberry32(seed);
  for (let i = 0; i < 8; i++) rand();

  const startBucket = Math.floor(now / intervalMs) - count + 1;
  const candles: Candle[] = [];
  let price = basePrice * (0.85 + rand() * 0.3);

  const trendBias = (rand() - 0.5) * 0.0012;
  const volatility = 0.004 + rand() * 0.012;
  const volumeBase = 200_000 + rand() * 4_000_000;

  for (let i = 0; i < count; i++) {
    const bucket = startBucket + i;
    const localRand = mulberry32(seed ^ bucket);
    const noise = (localRand() - 0.5) * 2 * volatility;
    const cyclical = Math.sin(bucket / 40 + (seed % 100)) * volatility * 0.6;
    const change = trendBias + noise + cyclical;

    const open = price;
    price = Math.max(0.5, price * (1 + change));
    const high = Math.max(open, price) * (1 + localRand() * volatility * 0.5);
    const low = Math.min(open, price) * (1 - localRand() * volatility * 0.5);
    const volume = Math.max(1000, volumeBase * (0.4 + localRand() * 1.6) * (1 + Math.abs(change) * 15));

    candles.push({ time: bucket * intervalMs, open, high, low, close: price, volume });
  }

  return candles;
}
