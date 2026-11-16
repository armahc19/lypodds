import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/common/page-header";
import { MatchCard } from "@/components/trading/match-card";
import { useSim } from "@/lib/sim/store";
import type { MatchStatus } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/matches/")({
  head: () => ({
    meta: [
      { title: "Live Matches — LYPODDS" },
      { name: "description", content: "Browse live, upcoming and finished football matches and jump into a trading room." },
      { property: "og:title", content: "Live Matches — LYPODDS" },
      { property: "og:description", content: "Live football matches with possession trading and event markets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchesPage,
});

const FILTERS: { id: MatchStatus; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "finished", label: "Finished" },
];

function MatchesPage() {
  const { state } = useSim();
  const [filter, setFilter] = useState<MatchStatus>("live");
  const list = state.matches.filter((m) => m.status === filter);
  return (
    <div>
      <PageHeader eyebrow="Markets" title="Live matches">
        <div className="flex rounded-lg border border-border bg-surface p-1">
          {FILTERS.map((f) => {
            const count = state.matches.filter((m) => m.status === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  filter === f.id ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label} <span className="num ml-1 text-xs text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
      </PageHeader>
      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      ) : (
        <p className="panel p-10 text-center text-sm text-muted-foreground">No {filter} matches right now.</p>
      )}
    </div>
  );
}
