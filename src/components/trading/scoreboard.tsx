import { LiveBadge } from "@/components/common/live-dot";
import { fmtClock } from "@/lib/sim/format";
import type { Match } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export function StatusChip({ match }: { match: Match }) {
  if (match.status === "live")
    return (
      <span className="flex items-center gap-2">
        <LiveBadge />
        <span className="num text-sm font-semibold">{fmtClock(match.clock)}</span>
      </span>
    );
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold tracking-widest text-muted-foreground">
      {match.status === "finished" ? "FT" : "UPCOMING"}
    </span>
  );
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  const total = home + away || 1;
  return (
    <div>
      <div className="num flex justify-between text-xs">
        <span>{home}</span>
        <span className="label-caps">{label}</span>
        <span>{away}</span>
      </div>
      <div className="mt-1 flex h-1 gap-0.5">
        <div className="rounded-l-full bg-bull" style={{ width: `${(home / total) * 100}%` }} />
        <div className="rounded-r-full bg-bear" style={{ width: `${(away / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function Scoreboard({ match, className }: { match: Match; className?: string }) {
  return (
    <div className={cn("panel p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-caps">
          {match.league} · {match.venue}
        </span>
        <StatusChip match={match} />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="label-caps text-bull">Home +</div>
          <div className="font-display text-lg font-bold md:text-2xl">{match.home.name}</div>
        </div>
        <div className="num rounded-lg border border-border bg-surface px-4 py-2 text-3xl font-bold md:text-4xl">
          {match.score.home}<span className="mx-2 text-muted-foreground">:</span>{match.score.away}
        </div>
        <div className="text-right">
          <div className="label-caps text-bear">Away −</div>
          <div className="font-display text-lg font-bold md:text-2xl">{match.away.name}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        <StatRow label="Poss %" home={Math.round(match.possession)} away={100 - Math.round(match.possession)} />
        <StatRow label="Shots" home={match.shots.home} away={match.shots.away} />
        <StatRow label="Corners" home={match.corners.home} away={match.corners.away} />
        <StatRow label="Cards" home={match.reds.home} away={match.reds.away} />
      </div>
    </div>
  );
}
