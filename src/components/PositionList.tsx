import type { Position } from "@/hooks/use-positions";
import { MARKETS } from "@/lib/markets";

export function PositionList({ rows }: { rows: Position[] }) {
  if (!rows.length) return <p className="py-8 text-sm text-muted-foreground">No positions yet.</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-sm">
    <thead><tr className="border-b border-border text-left font-mono text-xs text-muted-foreground">
      <th className="py-3">Market / side</th><th>Stake</th><th>Odds</th><th>Status</th><th>Return</th><th>P&L</th>
    </tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border">
      <td className="py-3"><div>{MARKETS.find((m) => m.key === r.market)?.label ?? r.market} <span className="ml-1 font-mono uppercase text-primary">{r.side}</span></div>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · ends {new Date(r.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div></td>
      <td className="font-mono">{Number(r.stake).toFixed(0)}</td><td className="font-mono">{Number(r.odds).toFixed(2)}</td>
      <td className={`font-mono uppercase text-xs ${r.status === "won" ? "text-up" : r.status === "lost" ? "text-down" : "text-muted-foreground"}`}>{r.status}</td>
      <td className="font-mono">{r.status === "open" ? "—" : Number(r.payout).toFixed(0)}</td>
      <td className={`font-mono ${Number(r.payout) >= Number(r.stake) ? "text-up" : "text-down"}`}>{r.status === "open" ? "—" : (Number(r.payout) - Number(r.stake)).toFixed(0)}</td>
    </tr>)}</tbody>
  </table></div>;
}
