"use client";

import { StockSnapshot } from "@/types/psx";
import { usePolling } from "@/hooks/use-polling";
import { Info, AlertTriangle } from "lucide-react";

interface ScreenerResponse {
  dataMode: "PSX_DELAYED" | "SIMULATED_FALLBACK";
  updatedAt: number;
  stocks: StockSnapshot[];
}

export function DataModeBanner() {
  const { data } = usePolling<ScreenerResponse>("/api/screener", 180_000);
  const liveCount = data?.stocks.filter((s) => s.dataSource !== "SIMULATED_FALLBACK").length ?? 0;
  const total = data?.stocks.length ?? 0;
  const allFallback = data && liveCount === 0;

  if (allFallback) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Live PSX data unavailable right now</span> — the public
          PSX data portal could not be reached, so every price shown below is a clearly-labeled
          simulated fallback, not real market data. This usually resolves on its own; refresh in
          a few minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Delayed PSX data</span> — sourced from PSX&apos;s public
        data portal ({liveCount}/{total || "…"} symbols live), refreshed every 3 minutes. This is
        for personal research, not a licensed real-time feed — for that, integrate a broker API
        (e.g. AKD) or PSX Data Vending in <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">lib/psxClient.ts</code>.
        Squeeze detection covers the Daily timeframe only, since free PSX data has no intraday
        history.
      </p>
    </div>
  );
}
