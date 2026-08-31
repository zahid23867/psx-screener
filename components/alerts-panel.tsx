"use client";

import { useEffect, useRef, useState } from "react";
import { AlertEvent } from "@/types/psx";
import { usePolling } from "@/hooks/use-polling";
import { SignalBadge } from "@/components/signal-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Zap, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AlertsResponse {
  dataMode: string;
  updatedAt: number;
  alerts: AlertEvent[];
}

const TYPE_ICON: Record<AlertEvent["type"], React.ElementType> = {
  BREAKOUT: Zap,
  SIGNAL_CHANGE: TrendingUp,
  SQUEEZE_FIRE: Activity,
  SCORE_THRESHOLD: Bell,
};

const POLL_MS = 60_000; // fastest cadence - still bounded by PSX board cache (~45s) and courtesy throttling

export function AlertsPanel() {
  const { data, loading } = usePolling<AlertsResponse>("/api/alerts", POLL_MS);
  const [soundOn, setSoundOn] = useState(true);
  const [feed, setFeed] = useState<AlertEvent[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playBeep() {
    if (!soundOn) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // audio not available - ignore silently, alert still shows visually
    }
  }

  useEffect(() => {
    if (!data?.alerts) return;
    const fresh = data.alerts.filter((a) => !seenIds.current.has(a.id));
    if (fresh.length > 0) {
      fresh.forEach((a) => seenIds.current.add(a.id));
      setFeed((prev) => [...fresh, ...prev].slice(0, 100));
      playBeep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" />
          Breakout &amp; signal alerts — checks every {POLL_MS / 1000}s against delayed PSX data,
          score threshold ≥ 70
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sound-toggle" className="text-sm text-muted-foreground">
            Sound
          </Label>
          <Switch id="sound-toggle" checked={soundOn} onCheckedChange={setSoundOn} />
        </div>
      </div>

      <div className="space-y-2">
        {loading && feed.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Watching for breakouts...
            </CardContent>
          </Card>
        )}
        {!loading && feed.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No alerts yet. New breakouts, squeeze fires, and Strong Buy/Sell flips will appear
              here as soon as they happen.
            </CardContent>
          </Card>
        )}
        {feed.map((a) => {
          const Icon = TYPE_ICON[a.type];
          return (
            <Card key={a.id} className="border-l-4 border-l-primary/60">
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(a.time, { addSuffix: true })} · Rs {a.price.toFixed(2)} ·{" "}
                      <span className={cn(a.changePct >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {a.changePct >= 0 ? "+" : ""}
                        {a.changePct.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                </div>
                <SignalBadge signal={a.signal} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
