// Pure, shared market logic. Used by server (pricing/settlement) and client (display).
export type Side = string;
export type Market = {
  key: string;
  label: string;
  sides: [string, string];
  kind: "trend" | "next" | "yesno";
  eventType?: string;
};

export const MARKETS: Market[] = [
  { key: "possession_trend", label: "Possession control", sides: ["buy", "sell"], kind: "trend" },
  { key: "next_goal", label: "Next goal", sides: ["home", "away"], kind: "next", eventType: "goal" },
  { key: "goal_5min", label: "Goal within 5 min", sides: ["yes", "no"], kind: "yesno", eventType: "goal" },
  { key: "next_corner", label: "Next corner", sides: ["home", "away"], kind: "next", eventType: "corner" },
  { key: "next_shot", label: "Next shot", sides: ["home", "away"], kind: "next", eventType: "shot" },
  { key: "red_card", label: "Red card", sides: ["yes", "no"], kind: "yesno", eventType: "red_card" },
  { key: "injury", label: "Injury", sides: ["yes", "no"], kind: "yesno", eventType: "injury" },
  { key: "next_possession", label: "Next possession swing", sides: ["home", "away"], kind: "next", eventType: "possession_change" },
];

export const ROUND_MS = 5 * 60 * 1000;
export const MARGIN = 0.92;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Home control share 0.1..0.9 from possession index (-100..100). */
export const homeShare = (possession: number) => clamp(0.5 + possession / 250, 0.1, 0.9);

const YES_PROB: Record<string, number> = { goal_5min: 0.3, red_card: 0.08, injury: 0.12 };

/** Probability of the given side winning. */
export function probability(marketKey: string, side: string, possession: number): number {
  const m = MARKETS.find((x) => x.key === marketKey);
  if (!m) throw new Error("Unknown market");
  if (!m.sides.includes(side)) throw new Error("Unknown side");
  let first: number;
  if (m.kind === "trend") first = clamp(0.5 - possession / 400, 0.2, 0.8); // mean-reverting market
  else if (m.kind === "next") first = homeShare(possession);
  else first = YES_PROB[m.key] ?? 0.2;
  return side === m.sides[0] ? first : 1 - first;
}

/** Decimal odds with house margin; minimum 1.01. */
export const oddsFor = (p: number) => Math.max(1.01, Math.round((MARGIN / p) * 100) / 100);

/** End of the current aligned 5-minute round; if under 30s remain, use the next round. */
export function roundEnd(now: number): number {
  const end = Math.ceil((now + 1) / ROUND_MS) * ROUND_MS;
  return end - now < 30_000 ? end + ROUND_MS : end;
}

export type Ev = { type: string; team: string | null; created_at: string };
export type Pos = { market: string; side: string; entry_value: number; created_at: string; expires_at: string };

/** Returns 'won' | 'lost' | 'void' when decidable, or null to keep open. */
export function decide(
  pos: Pos,
  events: Ev[],
  currentPossession: number,
  now: number,
  matchFinished: boolean,
): "won" | "lost" | "void" | null {
  const m = MARKETS.find((x) => x.key === pos.market);
  if (!m) return "void";
  const start = Date.parse(pos.created_at);
  const end = Date.parse(pos.expires_at);
  const expired = now >= end || matchFinished;
  const inWindow = events
    .filter((e) => {
      const t = Date.parse(e.created_at);
      return t > start && t <= end && e.type === m.eventType;
    })
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

  if (m.kind === "next") {
    const first = inWindow[0];
    if (first) return first.team === pos.side ? "won" : "lost";
    return expired ? "void" : null;
  }
  if (m.kind === "yesno") {
    if (inWindow.length) return pos.side === "yes" ? "won" : "lost";
    return expired ? (pos.side === "no" ? "won" : "lost") : null;
  }
  if (!expired) return null;
  if (currentPossession === pos.entry_value) return "void";
  const up = currentPossession > pos.entry_value;
  return (pos.side === "buy") === up ? "won" : "lost";
}

/** One simulation step (2s real time). rnd is injectable for tests. */
export function simStep(possession: number, rnd: () => number = Math.random) {
  const noise = (rnd() + rnd() + rnd() - 1.5) * 14;
  const next = clamp(Math.round((possession + noise - possession * 0.04) * 10) / 10, -100, 100);
  const h = homeShare(next);
  const events: { type: string; team: string | null }[] = [];
  const team = () => (rnd() < h ? "home" : "away");
  if (Math.sign(next) !== Math.sign(possession) && next !== 0) events.push({ type: "possession_change", team: next > 0 ? "home" : "away" });
  if (rnd() < 0.07) events.push({ type: "shot", team: team() });
  if (rnd() < 0.035) events.push({ type: "corner", team: team() });
  if (rnd() < 0.012) events.push({ type: "goal", team: team() });
  if (rnd() < 0.003) events.push({ type: "red_card", team: team() });
  if (rnd() < 0.005) events.push({ type: "injury", team: team() });
  return { possession: next, events };
}

