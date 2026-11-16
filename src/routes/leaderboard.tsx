import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Crown } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { fmtPct, fmtPts, fmtSigned } from "@/lib/sim/format";
import { featuredMatch, lastSettledRound, leaderboard, type LeaderRow } from "@/lib/sim/selectors";
import { useSim } from "@/lib/sim/store";
import type { Scope } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — LYPODDS" },
      { name: "description", content: "Live round, match, daily and global rankings of LYPODDS traders by points and accuracy." },
      { property: "og:title", content: "Leaderboard — LYPODDS" },
      { property: "og:description", content: "Who's reading the game best? Live trader rankings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const SCOPES: { id: Scope; label: string }[] = [
  { id: "round", label: "Round" },
  { id: "match", label: "Match" },
  { id: "daily", label: "Daily" },
  { id: "global", label: "Global" },
];

function useRankDeltas(rows: LeaderRow[], scope: Scope) {
  const prev = useRef<{ scope: Scope; ranks: Map<string, number> }>({ scope, ranks: new Map() });
  const [deltas, setDeltas] = useState<Map<string, number>>(new Map());
  const key = rows.map((r) => r.id).join(",");
  useEffect(() => {
    const ranks = new Map(rows.map((r) => [r.id, r.rank]));
    if (prev.current.scope === scope && prev.current.ranks.size) {
      const d = new Map<string, number>();
      for (const [id, rank] of ranks) {
        const before = prev.current.ranks.get(id);
        if (before !== undefined && before !== rank) d.set(id, before - rank);
      }
      if (d.size) setDeltas(d);
    } else setDeltas(new Map());
    prev.current = { scope, ranks };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, scope]);
  return deltas;
}

function LeaderboardPage() {
  const { state } = useSim();
  const [scope, setScope] = useState<Scope>("round");
  const rows = leaderboard(state, scope);
  const deltas = useRankDeltas(rows, scope);
  const f = featuredMatch(state);
  const you = rows.find((r) => r.isUser)!;
  const subtitle =
    scope === "round" && f
      ? `${f.home.short} v ${f.away.short} · Round ${Math.max(1, lastSettledRound(f))} results`
      : scope === "match" && f
        ? `${f.home.name} v ${f.away.name}`
        : scope === "daily"
          ? "Points won today"
          : "All-time points";
  const podium = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Rankings" title="Leaderboard">
        <div className="flex rounded-lg border border-border bg-surface p-1">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScope(s.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                scope === s.id ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1.2fr]">
        {podium.map((r) => (
          <div key={r.id} className={cn("panel relative overflow-hidden p-4", r.rank === 1 && "border-primary/50")}>
            <div className="flex items-center justify-between">
              <span className={cn("num text-3xl font-bold", r.rank === 1 ? "text-brand-gradient" : "text-muted-foreground")}>#{r.rank}</span>
              {r.rank === 1 && <Crown className="size-5 text-primary" />}
            </div>
            <div className="mt-2 truncate font-display font-semibold">{r.username}</div>
            <div className="num mt-1 text-sm text-muted-foreground">
              {scope === "global" ? fmtPts(r.points) : fmtSigned(r.points)} pts · {fmtPct(r.accuracy)}
            </div>
          </div>
        ))}
        <div className="panel border-primary/40 bg-primary/5 p-4">
          <div className="label-caps">Your position</div>
          <div className="num mt-1 text-3xl font-bold text-primary">#{you.rank}</div>
          <div className="num mt-1 text-sm text-muted-foreground">
            {scope === "global" ? fmtPts(you.points) : fmtSigned(you.points)} pts · {you.predictions} predictions · {fmtPct(you.accuracy)}
          </div>
        </div>
      </div>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{SCOPES.find((s) => s.id === scope)!.label} rankings</h2>
          <span className="label-caps">{subtitle}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps w-16 py-2 font-normal">Rank</th>
                <th className="label-caps py-2 font-normal">Trader</th>
                <th className="label-caps py-2 text-right font-normal">Predictions</th>
                <th className="label-caps py-2 text-right font-normal">Accuracy</th>
                <th className="label-caps py-2 text-right font-normal">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const d = deltas.get(r.id);
                return (
                  <tr key={r.id} className={cn("border-b border-border/60 transition-colors last:border-0", r.isUser && "bg-primary/10")}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("num font-bold", r.rank <= 3 ? "text-primary" : "text-muted-foreground")}>{r.rank}</span>
                        {d !== undefined && (d > 0 ? <ArrowUp className="size-3 text-bull" /> : <ArrowDown className="size-3 text-bear" />)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-medium">{r.username}</span>
                      {r.isUser && <span className="ml-2 rounded-sm bg-primary/20 px-1 font-mono text-[0.6rem] text-primary">YOU</span>}
                      <span className="ml-2 font-mono text-[0.65rem] text-muted-foreground">{r.country}</span>
                    </td>
                    <td className="num py-2.5 text-right text-muted-foreground">{r.predictions}</td>
                    <td className="num py-2.5 text-right">{fmtPct(r.accuracy)}</td>
                    <td className={cn("num py-2.5 text-right font-semibold", scope !== "global" && (r.points >= 0 ? "text-bull" : "text-bear"))}>
                      {scope === "global" ? fmtPts(r.points) : fmtSigned(r.points)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
