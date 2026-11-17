import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Position = Database["public"]["Tables"]["positions"]["Row"];

export function usePositions(matchId?: string) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Position[]>([]);
  useEffect(() => {
    setRows([]);
    if (!user) return;
    let active = true;
    const load = async () => {
      let q = supabase.from("positions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (matchId) q = q.eq("match_id", matchId);
      const { data } = await q;
      if (active) setRows(data ?? []);
    };
    load();
    const poll = setInterval(load, 2500);
    return () => { active = false; clearInterval(poll); };
  }, [user?.id, matchId]);
  return rows;
}
