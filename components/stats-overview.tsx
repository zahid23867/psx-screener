"use client";

import { useMemo } from "react";
import { StockSnapshot } from "@/types/psx";
import { usePolling } from "@/hooks/use-polling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Zap, BarChart3 } from "lucide-react";

interface ScreenerResponse {
  dataMode: string;
  updatedAt: number;
  stocks: StockSnapshot[];
}

export function StatsOverview() {
  const { data } = usePolling<ScreenerResponse>("/api/screener", 180_000);

  const stats = useMemo(() => {
    const stocks = data?.stocks ?? [];
    const strongBuys = stocks.filter((s) => s.signal === "STRONG_BUY").length;
    const strongSells = stocks.filter((s) => s.signal === "STRONG_SELL").length;
    const breakouts = stocks.filter((s) => s.breakout).length;
    const avgUpside =
      stocks.length > 0 ? stocks.reduce((a, s) => a + Math.max(0, s.upsidePct), 0) / stocks.length : 0;
    return { strongBuys, strongSells, breakouts, avgUpside };
  }, [data]);

  const cards = [
    { title: "Strong Buy Signals", value: stats.strongBuys, icon: TrendingUp, tone: "text-emerald-600" },
    { title: "Strong Sell Signals", value: stats.strongSells, icon: TrendingDown, tone: "text-red-600" },
    { title: "Active Breakouts", value: stats.breakouts, icon: Zap, tone: "text-orange-500" },
    {
      title: "Avg. Upside to 1M High",
      value: `${stats.avgUpside.toFixed(1)}%`,
      icon: BarChart3,
      tone: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.tone}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
