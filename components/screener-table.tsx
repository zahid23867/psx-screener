"use client";

import { useMemo, useState } from "react";
import { StockSnapshot } from "@/types/psx";
import { usePolling } from "@/hooks/use-polling";
import { SignalBadge } from "@/components/signal-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, Zap, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScreenerResponse {
  dataMode: string;
  updatedAt: number;
  stocks: StockSnapshot[];
}

type SortKey = "score" | "changePct" | "volumeRatio" | "upsidePct" | "price";
type SortDir = "asc" | "desc";

const SIGNAL_FILTERS = ["ALL", "STRONG_BUY", "BUY", "NEUTRAL", "SELL", "STRONG_SELL"] as const;

export function ScreenerTable() {
  const { data, loading } = usePolling<ScreenerResponse>("/api/screener", 180_000);
  const [search, setSearch] = useState("");
  const [signalFilter, setSignalFilter] = useState<(typeof SIGNAL_FILTERS)[number]>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    let stocks = data?.stocks ?? [];
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      stocks = stocks.filter((s) => s.symbol.includes(q) || s.name.toUpperCase().includes(q));
    }
    if (signalFilter !== "ALL") {
      stocks = stocks.filter((s) => s.signal === signalFilter);
    }
    return [...stocks].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
  }, [data, search, signalFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn(
          "flex items-center gap-1 text-xs font-semibold uppercase tracking-wide",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {active && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={signalFilter} onValueChange={(v) => setSignalFilter(v as typeof signalFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by signal" />
          </SelectTrigger>
          <SelectContent>
            {SIGNAL_FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {f === "ALL" ? "All signals" : f.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right"><SortHeader label="Price" k="price" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Chg %" k="changePct" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Vol x Avg" k="volumeRatio" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Upside to 1M High" k="upsidePct" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Score" k="score" /></TableHead>
              <TableHead>Signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && !data
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((s) => (
                  <TableRow key={s.symbol}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.breakout && <Zap className="h-3.5 w-3.5 text-orange-500" />}
                        <div>
                          <div className="flex items-center gap-1.5">
                            {s.symbol}
                            {s.dataSource === "SIMULATED_FALLBACK" && (
                              <span className="rounded bg-red-500/10 px-1 text-[10px] font-medium text-red-600">
                                DEMO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.sector}</TableCell>
                    <TableCell className="text-right tabular-nums">Rs {s.price.toFixed(2)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        s.changePct >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {s.changePct >= 0 ? "+" : ""}
                      {s.changePct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.volumeRatio.toFixed(1)}x</TableCell>
                    <TableCell className="text-right tabular-nums">{s.upsidePct.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{s.score}</TableCell>
                    <TableCell>
                      <SignalBadge signal={s.signal} />
                    </TableCell>
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No stocks match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
