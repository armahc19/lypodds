import { Lock, LockOpen } from "lucide-react";

import { LOCK_SECONDS, ROUND_SECONDS, TOTAL_ROUNDS } from "@/lib/sim/constants";
import { isRoundOpen, roundRemaining } from "@/lib/sim/engine";
import { fmtClock } from "@/lib/sim/format";
import type { Match } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export function RoundTimer({ match, className }: { match: Match; className?: string }) {
  const open = isRoundOpen(match);
  const live = match.status === "live";
  const remaining = roundRemaining(match);
  const progress = Math.min(1, (match.clock - match.round.start) / ROUND_SECONDS);
  const lockAt = 1 - LOCK_SECONDS / ROUND_SECONDS;
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="label-caps">
          Round {match.round.number}/{TOTAL_ROUNDS}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold tracking-widest",
            !live && "bg-muted text-muted-foreground",
            live && open && "bg-bull-soft text-bull",
            live && !open && "bg-primary/15 text-primary",
          )}
        >
          {live && open && <LockOpen className="size-3" />}
          {live && !open && <Lock className="size-3" />}
          {!live ? (match.status === "finished" ? "CLOSED" : "PRE-MATCH") : open ? "OPEN" : "LOCKED"}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="num text-3xl font-bold">{fmtClock(remaining)}</span>
        <span className="text-xs text-muted-foreground">
          {!live ? "" : open ? `locks in ${fmtClock(remaining - LOCK_SECONDS)}` : "settling at close"}
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient transition-[width] duration-500 ease-linear" style={{ width: `${progress * 100}%` }} />
        <div className="absolute inset-y-0 w-px bg-foreground/60" style={{ left: `${lockAt * 100}%` }} />
      </div>
      <div className="mt-1.5 text-[0.68rem] text-muted-foreground">5-minute match-time window · locks 1 min before close</div>
    </div>
  );
}
