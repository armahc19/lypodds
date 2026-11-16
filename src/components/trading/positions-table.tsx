import { Link } from "@tanstack/react-router";

import { MARKET_LABELS, fmtOdds, fmtPts, fmtSigned, positionPick } from "@/lib/sim/format";
import type { Position } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

function StatusPill({ p }: { p: Position }) {
  return (
    <span
      className={cn(
        "rounded-sm px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold tracking-widest",
        p.status === "open" && "bg-primary/15 text-primary",
        p.status === "won" && "bg-bull-soft text-bull",
        p.status === "lost" && "bg-bear-soft text-bear",
        p.status === "void" && "bg-muted text-muted-foreground",
      )}
    >
      {p.status.toUpperCase()}
    </span>
  );
}

export function PositionsTable({
  positions,
  showMatch = true,
  empty = "No positions yet.",
}: {
  positions: Position[];
  showMatch?: boolean;
  empty?: string;
}) {
  if (!positions.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {showMatch && <th className="label-caps py-2 pr-3 font-normal">Match</th>}
            <th className="label-caps py-2 pr-3 font-normal">Market</th>
            <th className="label-caps py-2 pr-3 font-normal">Pick</th>
            <th className="label-caps py-2 pr-3 text-right font-normal">Stake</th>
            <th className="label-caps py-2 pr-3 text-right font-normal">Odds</th>
            <th className="label-caps py-2 pr-3 text-right font-normal">P/L</th>
            <th className="label-caps py-2 text-right font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const pnl = p.payout - p.stake;
            const pick = positionPick(p);
            return (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                {showMatch && (
                  <td className="py-2.5 pr-3">
                    <Link to="/matches/$matchId" params={{ matchId: p.matchId }} className="hover:text-primary">
                      {p.homeShort} v {p.awayShort}
                    </Link>
                    <span className="num ml-2 text-xs text-muted-foreground">R{p.round}</span>
                  </td>
                )}
                <td className="py-2.5 pr-3 text-muted-foreground">{MARKET_LABELS[p.market]}</td>
                <td
                  className={cn(
                    "py-2.5 pr-3 font-medium",
                    (p.selection === "buy" || p.selection === "home") && "text-bull",
                    (p.selection === "sell" || p.selection === "away") && "text-bear",
                  )}
                >
                  {pick}
                </td>
                <td className="num py-2.5 pr-3 text-right">{fmtPts(p.stake)}</td>
                <td className="num py-2.5 pr-3 text-right">{fmtOdds(p.odds)}</td>
                <td
                  className={cn(
                    "num py-2.5 pr-3 text-right font-semibold",
                    p.status === "open" && "text-muted-foreground",
                    p.status !== "open" && pnl > 0 && "text-bull",
                    p.status !== "open" && pnl < 0 && "text-bear",
                  )}
                >
                  {p.status === "open" ? `→ ${fmtPts(Math.round(p.stake * p.odds))}` : fmtSigned(pnl)}
                </td>
                <td className="py-2.5 text-right">
                  <StatusPill p={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
