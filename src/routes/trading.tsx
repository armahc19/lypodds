import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OddsValue } from "@/components/common/odds-value";
import { PageHeader } from "@/components/common/page-header";
import { Sparkline } from "@/components/common/sparkline";
import { PositionsTable } from "@/components/trading/positions-table";
import { isRoundOpen, roundRemaining } from "@/lib/sim/engine";
import { fmtClock, fmtIndex, fmtMinute, fmtPts, fmtSigned } from "@/lib/sim/format";
import { userStats } from "@/lib/sim/selectors";
import { useSim } from "@/lib/sim/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trading")({
  head: () => ({
    meta: [
      { title: "Trading — LYPODDS" },
      { name: "description", content: "Market watch across live matches plus your open, settled and historical positions." },
      { property: "og:title", content: "Trading Desk — LYPODDS" },
      { property: "og:description", content: "Market watch, open positions and trading history in virtual points." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TradingPage,
});

function TradingPage() {
  const { state } = useSim();
  const live = state.matches.filter((m) => m.status === "live");
  const positions = state.user.positions;
  const open = positions.filter((p) => p.status === "open");
  const settled = positions.filter((p) => p.status !== "open");
  const s = userStats(positions);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Desk" title="Trading">
        <div className="panel flex gap-6 px-4 py-2.5">
          <div>
            <div className="label-caps">At stake</div>
            <div className="num font-semibold">{fmtPts(s.openStake)}</div>
          </div>
          <div>
            <div className="label-caps">Realised P/L</div>
            <div className={cn("num font-semibold", s.pnl >= 0 ? "text-bull" : "text-bear")}>{fmtSigned(s.pnl)}</div>
          </div>
        </div>
      </PageHeader>

      <section className="panel p-4">
        <h2 className="mb-3 text-lg font-semibold">Market watch · possession</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps py-2 font-normal">Match</th>
                <th className="label-caps py-2 font-normal">Clock</th>
                <th className="label-caps w-40 py-2 font-normal">Trend</th>
                <th className="label-caps py-2 text-right font-normal">Index</th>
                <th className="label-caps py-2 text-right font-normal">BUY</th>
                <th className="label-caps py-2 text-right font-normal">SELL</th>
                <th className="label-caps py-2 text-right font-normal">Round</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {live.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5">
                    <div className="font-medium">{m.home.short} {m.score.home}-{m.score.away} {m.away.short}</div>
                    <div className="text-xs text-muted-foreground">{m.league}</div>
                  </td>
                  <td className="num py-2.5 text-muted-foreground">{fmtMinute(m.clock)}</td>
                  <td className="py-2.5 pr-4"><Sparkline values={m.series.slice(-48).map((p) => p.v)} className="h-8" /></td>
                  <td className={cn("num py-2.5 text-right font-semibold", m.index >= 0 ? "text-bull" : "text-bear")}>{fmtIndex(m.index)}</td>
                  <td className="py-2.5 text-right text-bull"><OddsValue odds={m.quotes.possession.buy!.odds} className="font-semibold" /></td>
                  <td className="py-2.5 text-right text-bear"><OddsValue odds={m.quotes.possession.sell!.odds} className="font-semibold" /></td>
                  <td className={cn("num py-2.5 text-right text-xs", isRoundOpen(m) ? "text-bull" : "text-primary")}>
                    R{m.round.number} · {fmtClock(roundRemaining(m))}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <Button asChild size="sm" variant="terminal">
                      <Link to="/matches/$matchId" params={{ matchId: m.id }}>Trade</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-4">
        <Tabs defaultValue="open">
          <TabsList className="bg-surface">
            <TabsTrigger value="open" className="data-[state=active]:bg-surface-raised">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="settled" className="data-[state=active]:bg-surface-raised">Settled ({settled.length})</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-surface-raised">History ({positions.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="mt-4">
            <PositionsTable positions={open} empty="No open positions. Open a trading room and BUY or SELL." />
          </TabsContent>
          <TabsContent value="settled" className="mt-4">
            <PositionsTable positions={settled} empty="Nothing settled yet." />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <PositionsTable positions={positions} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
