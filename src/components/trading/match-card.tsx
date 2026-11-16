import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { OddsValue } from "@/components/common/odds-value";
import { Sparkline } from "@/components/common/sparkline";
import { StatusChip } from "@/components/trading/scoreboard";
import { isRoundOpen, roundRemaining } from "@/lib/sim/engine";
import { fmtClock, fmtIndex } from "@/lib/sim/format";
import type { Match } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export function MatchCard({ match }: { match: Match }) {
  const values = match.series.slice(-72).map((p) => p.v);
  const lead = match.index >= 0;
  const live = match.status === "live";
  return (
    <Link
      to="/matches/$matchId"
      params={{ matchId: match.id }}
      className="panel group block p-4 transition-colors hover:border-muted-foreground/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps truncate">{match.league}</span>
        <StatusChip match={match} />
      </div>
      <div className="mt-3 space-y-1.5">
        {(["home", "away"] as const).map((side) => (
          <div key={side} className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <span className={cn("h-3.5 w-1 rounded-full", side === "home" ? "bg-bull" : "bg-bear")} />
              {match[side].name}
            </span>
            <span className="num text-lg font-bold">{match.status === "upcoming" ? "–" : match.score[side]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-surface">
        <Sparkline values={values.length > 1 ? values : [0, 0]} className="h-12" />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={cn("num font-semibold", lead ? "text-bull" : "text-bear")}>IDX {fmtIndex(match.index)}</span>
        {live ? (
          <span className="num text-muted-foreground">
            R{match.round.number} · {isRoundOpen(match) ? "open" : "locked"} {fmtClock(roundRemaining(match))}
          </span>
        ) : (
          <span className="text-muted-foreground">{match.venue}</span>
        )}
      </div>
      {live && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <div className="flex items-center justify-between rounded-md bg-bull-soft px-2 py-1.5 text-xs">
            <span className="font-semibold text-bull">BUY</span>
            <OddsValue odds={match.quotes.possession.buy!.odds} />
          </div>
          <div className="flex items-center justify-between rounded-md bg-bear-soft px-2 py-1.5 text-xs">
            <span className="font-semibold text-bear">SELL</span>
            <OddsValue odds={match.quotes.possession.sell!.odds} />
          </div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground transition-colors group-hover:text-primary">
        {live ? "Enter trading room" : "View match"} <ChevronRight className="size-3.5" />
      </div>
    </Link>
  );
}
