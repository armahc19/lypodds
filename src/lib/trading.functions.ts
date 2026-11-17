import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MARKETS, decide, oddsFor, probability, roundEnd, simStep } from "./markets";

const STEP_MS = 2000;
const STEPS_PER_MINUTE = 5;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function settleOpen(db: Awaited<ReturnType<typeof admin>>, matchId?: string) {
  let q = db.from("positions").select("*").eq("status", "open").limit(500);
  if (matchId) q = q.eq("match_id", matchId);
  const { data: open } = await q;
  if (!open?.length) return;
  const ids = [...new Set(open.map((p) => p.match_id))];
  const { data: matches } = await db.from("matches").select("id,possession,status").in("id", ids);
  const first = open[0];
  if (!first) return;
  const minStart = open.reduce((m, p) => (p.created_at < m ? p.created_at : m), first.created_at);
  const { data: events } = await db.from("match_events").select("match_id,type,team,created_at").in("match_id", ids).gte("created_at", minStart);
  const now = Date.now();
  for (const p of open) {
    const m = matches?.find((x) => x.id === p.match_id);
    if (!m) continue;
    const res = decide(
      { ...p, entry_value: Number(p.entry_value) },
      (events ?? []).filter((e) => e.match_id === p.match_id),
      Number(m.possession),
      now,
      m.status === "finished",
    );
    if (!res) continue;
    const { error } = await db.rpc("settle_position_atomic", { _id: p.id, _result: res });
    if (error) throw new Error(error.message);
  }
}

/** Advances simulated live matches and settles due positions. Idempotent; safe to call often. */
export const tickSimulation = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  const { data: live } = await db.from("matches").select("*").eq("status", "live");
  const now = Date.now();
  for (const m of live ?? []) {
    const elapsed = now - Date.parse(m.last_tick_at);
    const steps = Math.min(30, Math.floor(elapsed / STEP_MS));
    if (steps < 1) continue;
    let poss = Number(m.possession);
    let { step, minute, home_score, away_score } = m;
    const hist = (Array.isArray(m.history) ? (m.history as number[]) : []).slice();
    const evs: { match_id: string; type: string; team: string | null; minute: number; created_at: string }[] = [];
    let status = m.status;
    for (let i = 0; i < steps; i++) {
      const r = simStep(poss);
      poss = r.possession;
      step++;
      if (step % STEPS_PER_MINUTE === 0) minute++;
      hist.push(poss);
      const at = new Date(Date.parse(m.last_tick_at) + (i + 1) * STEP_MS).toISOString();
      for (const e of r.events) {
        if (e.type === "goal") e.team === "home" ? home_score++ : away_score++;
        evs.push({ match_id: m.id, type: e.type, team: e.team, minute, created_at: at });
      }
      if (minute >= 90) { status = "finished"; break; }
    }
    const { data: ok } = await db
      .from("matches")
      .update({
        possession: poss, step, minute, home_score, away_score, status,
        history: hist.slice(-180),
        last_tick_at: new Date(Date.parse(m.last_tick_at) + steps * STEP_MS).toISOString(),
      })
      .eq("id", m.id)
      .eq("last_tick_at", m.last_tick_at)
      .select("id");
    if (ok?.length && evs.length) await db.from("match_events").insert(evs);
  }
  await settleOpen(db);
  return { ok: true };
});

export const placePosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { matchId: string; market: string; side: string; stake: number }) => {
    if (!MARKETS.some((m) => m.key === d.market && m.sides.includes(d.side))) throw new Error("Invalid market");
    const stake = Math.floor(Number(d.stake));
    if (!(stake >= 1 && stake <= 1000)) throw new Error("Stake must be 1–1000 points");
    return { ...d, stake };
  })
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: m } = await db.from("matches").select("id,status,possession").eq("id", data.matchId).single();
    if (!m || m.status !== "live") throw new Error("Market closed: match is not live");
    const poss = Number(m.possession);
    const odds = oddsFor(probability(data.market, data.side, poss));
    const { error } = await db.rpc("open_position_atomic", {
      _user_id: context.userId, _match_id: m.id, _market: data.market, _side: data.side,
      _stake: data.stake, _odds: odds, _entry: poss, _expires: new Date(roundEnd(Date.now())).toISOString(),
    });
    if (error) throw new Error(error.message);
    return { odds };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only");
}

export const adminCreateMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { home: string; away: string }) => {
    const home = d.home.trim().slice(0, 40), away = d.away.trim().slice(0, 40);
    if (!home || !away) throw new Error("Team names required");
    return { home, away };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    await db.from("matches").insert({ home: data.home, away: data.away, status: "upcoming" });
    return { ok: true };
  });

export const adminUpdateMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status?: string; possession?: number; minute?: number; reset?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const patch: { status?: string; last_tick_at?: string; possession?: number; minute?: number; home_score?: number; away_score?: number; step?: number; history?: number[] } = {};
    if (data.status && ["upcoming", "live", "paused", "finished"].includes(data.status)) {
      patch.status = data.status;
      if (data.status === "live") patch.last_tick_at = new Date().toISOString();
    }
    if (typeof data.possession === "number") patch.possession = Math.max(-100, Math.min(100, data.possession));
    if (typeof data.minute === "number") patch.minute = Math.max(0, Math.min(90, Math.floor(data.minute)));
    if (data.reset) Object.assign(patch, { home_score: 0, away_score: 0, minute: 0, step: 0, possession: 0, history: [], status: "upcoming" });
    await db.from("matches").update(patch).eq("id", data.id);
    if (patch.status === "finished") await settleOpen(db, data.id);
    return { ok: true };
  });

export const adminTriggerEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; type: string; team: "home" | "away" }) => {
    if (!["goal", "corner", "shot", "red_card", "injury"].includes(d.type)) throw new Error("Bad event");
    if (!["home", "away"].includes(d.team)) throw new Error("Bad team");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: m } = await db.from("matches").select("*").eq("id", data.id).single();
    if (!m) throw new Error("No match");
    if (data.type === "goal") {
      await db.from("matches").update(data.team === "home" ? { home_score: m.home_score + 1 } : { away_score: m.away_score + 1 }).eq("id", m.id);
    }
    await db.from("match_events").insert({ match_id: m.id, type: data.type, team: data.team, minute: m.minute });
    await settleOpen(db, m.id);
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [{ data: users }, { data: positions }] = await Promise.all([
      db.from("profiles").select("id,username,points,created_at").order("points", { ascending: false }).limit(100),
      db.from("positions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    return { users: users ?? [], positions: positions ?? [] };
  });

