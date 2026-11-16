import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Ambulance, ArrowDown, ArrowUp, Crosshair, FastForward, Flag, Goal, Pause, Play, SkipForward, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { MatchFeed } from "@/components/trading/match-feed";
import { PossessionChart } from "@/components/trading/possession-chart";
import { RoundTimer } from "@/components/trading/round-timer";
import { Scoreboard } from "@/components/trading/scoreboard";
import { newAdminSeed, useSim } from "@/lib/sim/store";
import type { EventType, Side } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Simulation Controls — LYPODDS" },
      { name: "description", content: "Development controls to drive possession, goals, corners, shots, cards, injuries and the match clock." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Simulation Controls — LYPODDS" },
      { property: "og:description", content: "Development-only match simulation panel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const EVENTS: { type: EventType; label: string; icon: typeof Goal }[] = [
  { type: "goal", label: "Goal", icon: Goal },
  { type: "corner", label: "Corner", icon: Flag },
  { type: "shot", label: "Shot", icon: Crosshair },
  { type: "red", label: "Red card", icon: Square },
  { type: "injury", label: "Injury", icon: Ambulance },
];
const SPEEDS = [0.5, 1, 2, 4];

function AdminPage() {
  const { state, dispatch } = useSim();
  const live = state.matches.filter((m) => m.status === "live");
  const [picked, setPicked] = useState(state.featuredMatchId);
  const match = live.find((m) => m.id === picked) ?? live[0];

  if (!match) return <p className="panel p-8 text-center text-muted-foreground">No live matches.</p>;
  const id = match.id;
  const push = (side: Side, amount: number) => dispatch({ type: "ADMIN_POSSESSION", matchId: id, side, amount });
  const fire = (event: EventType, side: Side) => dispatch({ type: "ADMIN_EVENT", matchId: id, event, side });

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Development only" title="Simulation controls">
        <Select value={id} onValueChange={setPicked}>
          <SelectTrigger className="w-64 bg-surface"><SelectValue /></SelectTrigger>
          <SelectContent>
            {live.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.home.name} v {m.away.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <Scoreboard match={match} />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="panel p-4">
          <PossessionChart match={match} positions={state.user.positions} className="h-[280px] md:h-[300px]" />
        </div>
        <div className="space-y-4">
          <div className="panel space-y-4 p-4">
            <div>
              <div className="label-caps mb-2">Match clock</div>
              <div className="flex flex-wrap gap-2">
                <Button variant="terminal" onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}>
                  {state.paused ? <Play /> : <Pause />} {state.paused ? "Resume" : "Pause"}
                </Button>
                <Button variant="terminal" onClick={() => dispatch({ type: "ADMIN_ADVANCE", matchId: id, seconds: 60, seed: newAdminSeed() })}>
                  <FastForward /> +1'
                </Button>
                <Button variant="terminal" onClick={() => dispatch({ type: "ADMIN_ADVANCE", matchId: id, seconds: 300, seed: newAdminSeed() })}>
                  <FastForward /> +5'
                </Button>
                <Button variant="brand" onClick={() => dispatch({ type: "ADMIN_CLOSE_ROUND", matchId: id, seed: newAdminSeed() })}>
                  <SkipForward /> Close round now
                </Button>
              </div>
            </div>
            <div>
              <div className="label-caps mb-2">Sim speed (all matches)</div>
              <div className="grid grid-cols-4 gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => dispatch({ type: "SET_SPEED", speed: s })}
                    className={cn(
                      "num rounded-md border py-1.5 text-sm transition-colors",
                      state.speed === s && !state.paused ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-raised hover:bg-accent",
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">At 1×, one real second ≈ 10 match seconds, so a 5-minute round lasts 30 s.</p>
            </div>
          </div>
          <RoundTimer match={match} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <h2 className="mb-3 text-lg font-semibold">Possession</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="buy" size="lg" onClick={() => push("home", 20)}><ArrowUp /> Push {match.home.short}</Button>
            <Button variant="sell" size="lg" onClick={() => push("away", 20)}><ArrowDown /> Push {match.away.short}</Button>
            <Button variant="bull-soft" onClick={() => push("home", 50)}>Big swing {match.home.short}</Button>
            <Button variant="bear-soft" onClick={() => push("away", 50)}>Big swing {match.away.short}</Button>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 text-lg font-semibold">Match events</h2>
          <div className="space-y-2">
            {(["home", "away"] as const).map((side) => (
              <div key={side} className="flex flex-wrap items-center gap-1.5">
                <span className={cn("w-12 font-mono text-xs font-semibold", side === "home" ? "text-bull" : "text-bear")}>{match[side].short}</span>
                {EVENTS.map(({ type, label, icon: Icon }) => (
                  <Button key={type} size="sm" variant={side === "home" ? "bull-soft" : "bear-soft"} onClick={() => fire(type, side)}>
                    <Icon /> {label}
                  </Button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <MatchFeed match={match} limit={10} />
    </div>
  );
}
