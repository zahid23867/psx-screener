import { KSE100 } from "@/data/kse100";
import { buildAllSnapshots } from "@/lib/signals";
import { AlertEvent, StockSnapshot } from "@/types/psx";

// Keeps the previously computed snapshot set in memory (per server process) so we can diff
// against it to derive alert *events* (crossing a threshold, flipping signal, squeeze firing).
// This is a best-effort cache: on serverless cold starts it just starts with no history,
// which only means the very first alerts call may return fewer events, never wrong ones.
let previousSnapshots: Map<string, StockSnapshot> | null = null;
let previousAt = 0;

export async function getAllSnapshots(now: number = Date.now()): Promise<StockSnapshot[]> {
  return buildAllSnapshots(KSE100, now);
}

export async function getAlerts(now: number = Date.now(), threshold = 70): Promise<AlertEvent[]> {
  const current = await getAllSnapshots(now);
  const currentMap = new Map(current.map((s) => [s.symbol, s]));
  const events: AlertEvent[] = [];

  if (previousSnapshots) {
    for (const snap of current) {
      const prev = previousSnapshots.get(snap.symbol);
      if (!prev) continue;

      if (snap.breakout && !prev.breakout) {
        events.push({
          id: `${snap.symbol}-breakout-${now}`,
          symbol: snap.symbol,
          name: snap.name,
          type: "BREAKOUT",
          signal: snap.signal,
          score: snap.score,
          message: `${snap.symbol} is breaking out - ${snap.changePct >= 0 ? "+" : ""}${snap.changePct.toFixed(2)}% on ${snap.volumeRatio.toFixed(1)}x volume`,
          price: snap.price,
          changePct: snap.changePct,
          time: now,
        });
      } else if (snap.score >= threshold && prev.score < threshold) {
        events.push({
          id: `${snap.symbol}-score-${now}`,
          symbol: snap.symbol,
          name: snap.name,
          type: "SCORE_THRESHOLD",
          signal: snap.signal,
          score: snap.score,
          message: `${snap.symbol} score crossed ${threshold} (now ${snap.score}) - signal: ${snap.signal.replace("_", " ")}`,
          price: snap.price,
          changePct: snap.changePct,
          time: now,
        });
      } else if (
        snap.signal !== prev.signal &&
        (snap.signal === "STRONG_BUY" || snap.signal === "STRONG_SELL")
      ) {
        events.push({
          id: `${snap.symbol}-signal-${now}`,
          symbol: snap.symbol,
          name: snap.name,
          type: "SIGNAL_CHANGE",
          signal: snap.signal,
          score: snap.score,
          message: `${snap.symbol} flipped to ${snap.signal.replace("_", " ")}`,
          price: snap.price,
          changePct: snap.changePct,
          time: now,
        });
      } else if (snap.squeeze.some((s) => s.firing) && !prev.squeeze.some((s) => s.firing)) {
        events.push({
          id: `${snap.symbol}-squeeze-${now}`,
          symbol: snap.symbol,
          name: snap.name,
          type: "SQUEEZE_FIRE",
          signal: snap.signal,
          score: snap.score,
          message: `${snap.symbol} squeeze firing on the Daily timeframe`,
          price: snap.price,
          changePct: snap.changePct,
          time: now,
        });
      }
    }
  } else {
    // First call ever (cold start): seed baseline alerts from current high-conviction names
    // so the Alerts tab isn't empty while the diff history warms up.
    for (const snap of current) {
      if (snap.score >= threshold || snap.breakout) {
        events.push({
          id: `${snap.symbol}-seed-${now}`,
          symbol: snap.symbol,
          name: snap.name,
          type: snap.breakout ? "BREAKOUT" : "SCORE_THRESHOLD",
          signal: snap.signal,
          score: snap.score,
          message: snap.breakout
            ? `${snap.symbol} is currently breaking out - ${snap.changePct >= 0 ? "+" : ""}${snap.changePct.toFixed(2)}%`
            : `${snap.symbol} score is ${snap.score} - signal: ${snap.signal.replace("_", " ")}`,
          price: snap.price,
          changePct: snap.changePct,
          time: now,
        });
      }
    }
  }

  previousSnapshots = currentMap;
  previousAt = now;

  return events.sort((a, b) => b.score - a.score);
}

export function getLastComputedAt() {
  return previousAt;
}
