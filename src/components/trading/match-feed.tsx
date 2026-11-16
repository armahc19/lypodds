import { Ambulance, Crosshair, Flag, Goal, Square } from "lucide-react";

import { fmtMinute } from "@/lib/sim/format";
import type { EventType, Match } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

const META: Record<EventType, { label: string; icon: typeof Goal }> = {
  goal: { label: "GOAL", icon: Goal },
  corner: { label: "Corner", icon: Flag },
  shot: { label: "Shot", icon: Crosshair },
  red: { label: "Red card", icon: Square },
  injury: { label: "Injury", icon: Ambulance },
};

export function MatchFeed({ match, limit = 14 }: { match: Match; limit?: number }) {
  const events = [...match.events].reverse().slice(0, limit);
  return (
    <div className="panel p-4">
      <h2 className="mb-3 text-lg font-semibold">Match feed</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e) => {
            const { label, icon: Icon } = META[e.type];
            const team = e.side === "home" ? match.home : match.away;
            return (
              <li
                key={e.id}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                  e.type === "goal" && "bg-primary/10",
                )}
              >
                <span className="num w-8 text-xs text-muted-foreground">{fmtMinute(e.clock)}</span>
                <Icon
                  className={cn(
                    "size-4",
                    e.type === "red" && "fill-bear text-bear",
                    e.type === "goal" && "text-primary",
                    e.type !== "red" && e.type !== "goal" && (e.side === "home" ? "text-bull" : "text-bear"),
                  )}
                />
                <span className={cn("font-medium", e.type === "goal" && "font-display font-bold text-primary")}>{label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{team.name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
