import { Badge } from "@/components/ui/badge";
import { SignalType } from "@/types/psx";
import { cn } from "@/lib/utils";

const STYLES: Record<SignalType, string> = {
  STRONG_BUY: "bg-emerald-600 text-white hover:bg-emerald-600",
  BUY: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 hover:bg-emerald-500/15",
  NEUTRAL: "bg-muted text-muted-foreground border border-border hover:bg-muted",
  SELL: "bg-red-500/15 text-red-600 border border-red-500/40 hover:bg-red-500/15",
  STRONG_SELL: "bg-red-600 text-white hover:bg-red-600",
};

const LABELS: Record<SignalType, string> = {
  STRONG_BUY: "Strong Buy",
  BUY: "Buy",
  NEUTRAL: "Neutral",
  SELL: "Sell",
  STRONG_SELL: "Strong Sell",
};

export function SignalBadge({ signal, className }: { signal: SignalType; className?: string }) {
  return <Badge className={cn(STYLES[signal], "font-medium", className)}>{LABELS[signal]}</Badge>;
}
