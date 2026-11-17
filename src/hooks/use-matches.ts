import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { tickSimulation } from "@/lib/trading.functions";
import type { Database } from "@/integrations/supabase/types";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchEvent = Database["public"]["Tables"]["match_events"]["Row"];

/** Drives the shared simulation forward while someone is watching. */
export function useSimulationTicker() {
  const tick = useServerFn(tickSimulation);
  useEffect(() => {
    let alive = true;
    const run = () => { if (alive && document.visibilityState === "visible") tick().catch(() => {}); };
    run();
    const id = setInterval(run, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [tick]);
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[] | null>(null);
  useEffect(() => {
    const load = () => supabase.from("matches").select("*").order("created_at").then(({ data }) => setMatches(data ?? []));
    load();
    const poll = setInterval(load, 3000);
    const ch = supabase
      .channel(`matches-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load)
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, []);
  return matches;
}

export function useMatch(id: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  useEffect(() => {
    setMatch(null);
    setEvents([]);
    const load = () => {
      supabase.from("matches").select("*").eq("id", id).maybeSingle().then(({ data }) => setMatch(data));
      supabase.from("match_events").select("*").eq("match_id", id).order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => setEvents(data ?? []));
    };
    load();
    const poll = setInterval(load, 3000);
    const ch = supabase
      .channel(`match-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` }, (p) => setMatch(p.new as Match))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "match_events", filter: `match_id=eq.${id}` }, (p) =>
        setEvents((e) => [p.new as MatchEvent, ...e.filter((x) => x.id !== (p.new as MatchEvent).id)].slice(0, 40)))
      .subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(ch); };
  }, [id]);
  return { match, events };
}

