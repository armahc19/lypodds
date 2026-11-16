import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Flame, ListChecks, Target, TrendingUp, Wallet } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Sparkline } from "@/components/common/sparkline";
import { StatTile } from "@/components/common/stat-tile";
import { PositionsTable } from "@/components/trading/positions-table";
import { STARTING_BALANCE } from "@/lib/sim/constants";
import { MARKET_LABELS, fmtPct, fmtPts, fmtSigned } from "@/lib/sim/format";
import { marketBreakdown, userStats } from "@/lib/sim/selectors";
import { useSim } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — LYPODDS" },
      { name: "description", content: "Your virtual points balance, prediction accuracy, winning streak and full trading history." },
      { property: "og:title", content: "Portfolio — LYPODDS" },
      { property: "og:description", content: "Balance, accuracy, streaks and trading history in virtual points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { state } = useSim();
  const { user } = state;
  const s = userStats(user.positions);
  const breakdown = marketBreakdown(user.positions);
  const change = user.balance + s.openStake - STARTING_BALANCE;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Portfolio" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile label="Balance" value={fmtPts(user.balance)} hint="virtual points" icon={<Wallet />} tone="brand" />
        <StatTile label="Total predictions" value={s.total} hint={`${s.open} open`} icon={<ListChecks />} />
        <StatTile label="Correct" value={s.won} hint={`${s.lost} wrong · ${s.voided} void`} icon={<CheckCircle2 />} tone="bull" />
        <StatTile label="Accuracy" value={fmtPct(s.accuracy, 1)} icon={<Target />} tone={s.accuracy >= 0.5 ? "bull" : "bear"} />
        <StatTile label="Win streak" value={user.streak} hint={`Best ${user.bestStreak}`} icon={<Flame />} />
        <StatTile label="Net P/L" value={fmtSigned(s.pnl)} hint="settled positions" icon={<TrendingUp />} tone={s.pnl >= 0 ? "bull" : "bear"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Balance history</h2>
              <p className="text-xs text-muted-foreground">Started with {fmtPts(STARTING_BALANCE)} pts</p>
            </div>
            <div className={cn("num text-xl font-bold", change >= 0 ? "text-bull" : "text-bear")}>
              {fmtSigned(change)} <span className="text-sm text-muted-foreground">({fmtPct(change / STARTING_BALANCE, 1)})</span>
            </div>
          </div>
          <div className="mt-4 rounded-md bg-surface p-2">
            <Sparkline values={user.balanceHistory.length > 1 ? user.balanceHistory : [user.balance, user.balance]} centered={false} className="h-48" width={600} height={180} />
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 text-lg font-semibold">By market</h2>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No settled predictions yet.</p>
          ) : (
            <ul className="space-y-3">
              {breakdown.map((b) => {
                const acc = b.won + b.lost ? b.won / (b.won + b.lost) : 0;
                return (
                  <li key={b.market}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{MARKET_LABELS[b.market]}</span>
                      <span className={cn("num font-semibold", b.pnl >= 0 ? "text-bull" : "text-bear")}>{fmtSigned(b.pnl)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bear/40">
                        <div className="h-full rounded-full bg-bull" style={{ width: `${acc * 100}%` }} />
                      </div>
                      <span className="num w-20 text-right text-xs text-muted-foreground">{b.won}/{b.won + b.lost} · {fmtPct(acc)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-2 text-lg font-semibold">Trading history</h2>
        <PositionsTable positions={user.positions} />
      </section>
    </div>
  );
}
