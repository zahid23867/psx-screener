"use client";

import { useMemo } from "react";
import { StockSnapshot } from "@/types/psx";
import { usePolling } from "@/hooks/use-polling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalBadge } from "@/components/signal-badge";
import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenerResponse {
  dataMode: string;
  updatedAt: number;
  stocks: StockSnapshot[];
}

export function SqueezePanel() {
  const { data, loading } = usePolling<ScreenerResponse>("/api/screener", 180_000);

  const { squeezing, firing } = useMemo(() => {
    const stocks = data?.stocks ?? [];
    return {
      squeezing: stocks.filter((s) => s.squeeze[0]?.isSqueezing),
      firing: stocks.filter((s) => s.squeeze[0]?.firing),
    };
  }, [data]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Bollinger-band squeeze detection on the <strong>Daily</strong> timeframe — free PSX data
        has no intraday tick history, so 1H/4H squeeze detection isn&apos;t available without a
        paid intraday feed. A tight squeeze signals compressed volatility building up; a firing
        squeeze means it just released — the classic setup for an explosive move within the
        month.
      </p>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            Daily Squeeze Setups
            <Badge variant="outline" className="font-normal">
              {squeezing.length} squeezing
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {loading && !data && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!loading && squeezing.length === 0 && (
            <p className="text-sm text-muted-foreground">No squeeze setups right now.</p>
          )}
          {squeezing
            .sort((a, b) => b.score - a.score)
            .map((s) => {
              const isFiring = firing.some((f) => f.symbol === s.symbol);
              return (
                <div
                  key={s.symbol}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                    isFiring && "border-orange-500/50 bg-orange-500/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isFiring ? (
                      <Zap className="h-3.5 w-3.5 text-orange-500" />
                    ) : (
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium">{s.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        Rs {s.price.toFixed(2)} · {isFiring ? "Firing now" : "Compressing"}
                      </div>
                    </div>
                  </div>
                  <SignalBadge signal={s.signal} />
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
