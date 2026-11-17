import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export function LeaderboardTable({ scope, matchId }: { scope: string; matchId?: string }) {
  const [rows, setRows] = useState<Database["public"]["Functions"]["get_leaderboard"]["Returns"]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", { _scope: scope, ...(matchId ? { _match: matchId } : {}) });
      if (active) { setRows(data ?? []); setError(Boolean(error)); }
    };
    load();
    const poll = setInterval(load, 5000);
    return () => { active = false; clearInterval(poll); };
  }, [scope, matchId]);
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[540px] text-sm"><thead className="text-muted-foreground"><tr className="border-b border-border text-left font-mono text-xs"><th className="py-3">Rank</th><th>Trader</th><th>Points</th><th>P&L</th><th>Accuracy</th><th>Streak</th></tr></thead>
      <tbody>{rows.map((r, i) => <tr key={r.user_id} className="border-b border-border"><td className="py-4 font-mono text-primary">{String(i + 1).padStart(2, "0")}</td><td>{r.username}</td><td className="font-mono">{Number(r.points).toFixed(0)}</td><td className={`font-mono ${Number(r.pnl) >= 0 ? "text-up" : "text-down"}`}>{Number(r.pnl).toFixed(0)}</td><td className="font-mono">{r.accuracy}%</td><td className="font-mono">{r.streak}</td></tr>)}</tbody>
    </table>
    {!rows.length && <p className="py-8 text-sm text-muted-foreground">{error ? "Rankings are temporarily unavailable." : "No settled predictions in this period."}</p>}
  </div>;
}
