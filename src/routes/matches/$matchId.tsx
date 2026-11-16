import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EventMarkets } from "@/components/trading/event-markets";
import { MatchFeed } from "@/components/trading/match-feed";
import { PositionsTable } from "@/components/trading/positions-table";
import { PossessionChart } from "@/components/trading/possession-chart";
import { Scoreboard } from "@/components/trading/scoreboard";
import { TradeTicket } from "@/components/trading/trade-ticket";
import { useSim } from "@/lib/sim/store";

export const Route = createFileRoute("/matches/$matchId")({
  head: () => ({
    meta: [
      { title: "Trading Room — LYPODDS" },
      { name: "description", content: "Trade live possession with BUY/SELL and predict goals, corners and shots in five-minute rounds." },
      { property: "og:title", content: "Live Trading Room — LYPODDS" },
      { property: "og:description", content: "BUY the home push, SELL the away push. Five-minute possession trading rounds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TradingRoom,
});

function TradingRoom() {
  const { matchId } = Route.useParams();
  const { state } = useSim();
  const match = state.matches.find((m) => m.id === matchId);

  if (!match) {
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Match no longer listed</h1>
        <p className="mt-2 text-sm text-muted-foreground">This match has finished and rotated off the board.</p>
        <Button asChild variant="brand" className="mt-5">
          <Link to="/matches">Browse live matches</Link>
        </Button>
      </div>
    );
  }

  const mine = state.user.positions.filter((p) => p.matchId === match.id);

  return (
    <div className="space-y-4">
      <Link to="/matches" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> All matches
      </Link>
      <Scoreboard match={match} />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="panel p-3 md:p-4">
          <div className="mb-1 flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold">Possession trading graph</h2>
            <span className="label-caps hidden sm:inline">Index −100 ↔ +100</span>
          </div>
          <PossessionChart match={match} positions={mine} />
        </div>
        <TradeTicket match={match} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <EventMarkets match={match} />
        <MatchFeed match={match} />
      </div>

      <div className="panel p-4">
        <h2 className="mb-2 text-lg font-semibold">My positions on this match</h2>
        <PositionsTable positions={mine} showMatch={false} empty="No positions on this match yet — BUY or SELL above." />
      </div>
    </div>
  );
}
