import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crosshair, Flame, Target, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/common/live-dot";
import { OddsValue } from "@/components/common/odds-value";
import { StatTile } from "@/components/common/stat-tile";
import { MatchCard } from "@/components/trading/match-card";
import { PossessionChart } from "@/components/trading/possession-chart";
import { RoundTimer } from "@/components/trading/round-timer";
import { isRoundOpen } from "@/lib/sim/engine";
import { MARKET_LABELS, fmtClock, fmtPct, fmtPts, fmtSigned, selectionLabel } from "@/lib/sim/format";
import { featuredMatch, leaderboard, userStats } from "@/lib/sim/selectors";
import { useSim } from "@/lib/sim/store";
import type { MarketId, Selection } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LYPODDS" },
      { name: "description", content: "Live football matches, possession markets and your virtual points balance on LYPODDS." },
      { property: "og:title", content: "LYPODDS Dashboard — Trade the Game" },
      { property: "og:description", content: "Live football matches, possession markets and your virtual points balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const HOT: { market: MarketId; selection: Selection }[] = [
  { market: "nextGoal", selection: "home" },
  { market: "goal5", selection: "yes" },
  { market: "nextCorner", selection: "away" },
];

function Dashboard() {
  const { state } = useSim();
  const f = featuredMatch(state);
  const stats = userStats(state.user.positions);
  const live = state.matches.filter((m) => m.status === "live");
  const upcoming = state.matches.filter((m) => m.status === "upcoming");
  const top = leaderboard(state, "daily").slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Virtual balance" value={fmtPts(state.user.balance)} hint="points · no real money" icon={<Wallet />} tone="brand" />
        <StatTile label="Open positions" value={stats.open} hint={`${fmtPts(stats.openStake)} pts at stake`} icon={<Crosshair />} />
        <StatTile label="Accuracy" value={fmtPct(stats.accuracy)} hint={`${stats.won} of ${stats.won + stats.lost} correct`} icon={<Target />} tone={stats.accuracy >= 0.5 ? "bull" : "bear"} />
        <StatTile label="Win streak" value={state.user.streak} hint={`Best ${state.user.bestStreak}`} icon={<Flame />} />
      </section>

      {f && (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <LiveBadge label="FEATURED" />
              <span className="label-caps">{f.league}</span>
            </div>
            <span className="num text-sm text-muted-foreground">{fmtClock(f.clock)}</span>
          </div>
          <div className="grid lg:grid-cols-[1fr_300px]">
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold md:text-2xl">
                  {f.home.name} <span className="num mx-2 text-primary">{f.score.home}:{f.score.away}</span> {f.away.name}
                </h2>
              </div>
              <PossessionChart match={f} positions={state.user.positions} className="h-[260px] md:h-[300px]" />
            </div>
            <div className="flex flex-col gap-3 border-t border-border p-4 lg:border-l lg:border-t-0">
              <RoundTimer match={f} />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-bull-soft p-2.5">
                  <div className="label-caps">HOME {f.home.short}</div>
                  <OddsValue odds={f.quotes.possession.buy!.odds} className="text-xl font-bold text-bull" />
                </div>
                <div className="rounded-md bg-bear-soft p-2.5">
                  <div className="label-caps">AWAY {f.away.short}</div>
                  <OddsValue odds={f.quotes.possession.sell!.odds} className="text-xl font-bold text-bear" />
                </div>
              </div>
              <Button asChild variant="brand" size="lg" className="mt-auto">
                <Link to="/matches/$matchId" params={{ matchId: f.id }}>
                  Enter trading room <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live now</h2>
          <Link to="/matches" className="text-xs text-muted-foreground hover:text-primary">All matches →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {live.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel min-w-0 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active markets</h2>
            <Link to="/trading" className="text-xs text-muted-foreground hover:text-primary">Market watch →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="label-caps py-2 font-normal">Match</th>
                  {HOT.map((h) => (
                    <th key={h.market} className="label-caps py-2 text-right font-normal">{MARKET_LABELS[h.market]}</th>
                  ))}
                  <th className="label-caps py-2 text-right font-normal">Round</th>
                </tr>
              </thead>
              <tbody>
                {live.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5">
                      <Link to="/matches/$matchId" params={{ matchId: m.id }} className="font-medium hover:text-primary">
                        {m.home.short} v {m.away.short}
                      </Link>
                    </td>
                    {HOT.map((h) => (
                      <td key={h.market} className="py-2.5 text-right">
                        <span className="mr-1.5 text-xs text-muted-foreground">{selectionLabel(h.selection, { home: m.home.short, away: m.away.short })}</span>
                        <OddsValue odds={m.quotes[h.market][h.selection]!.odds} className="font-semibold" />
                      </td>
                    ))}
                    <td className={cn("num py-2.5 text-right text-xs", isRoundOpen(m) ? "text-bull" : "text-primary")}>
                      R{m.round.number} {isRoundOpen(m) ? "OPEN" : "LOCK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {upcoming.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="label-caps mb-2">Next up</div>
              <div className="flex flex-wrap gap-2">
                {upcoming.map((m) => (
                  <span key={m.id} className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs">
                    {m.home.name} v {m.away.name} <span className="text-muted-foreground">· {m.league}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's top traders</h2>
            <Link to="/leaderboard" className="text-xs text-muted-foreground hover:text-primary">Leaderboard →</Link>
          </div>
          <ol className="space-y-1">
            {top.map((r) => (
              <li key={r.id} className={cn("flex items-center gap-3 rounded-md px-2 py-2", r.isUser && "bg-primary/10")}>
                <span className={cn("num w-5 text-sm font-bold", r.rank <= 3 ? "text-primary" : "text-muted-foreground")}>{r.rank}</span>
                <span className="flex-1 truncate text-sm font-medium">{r.username}</span>
                <span className="num text-xs text-muted-foreground">{fmtPct(r.accuracy)}</span>
                <span className={cn("num w-20 text-right text-sm font-semibold", r.points >= 0 ? "text-bull" : "text-bear")}>{fmtSigned(r.points)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
