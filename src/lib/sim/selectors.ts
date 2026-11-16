import type { MarketId, Match, Position, Scope, ScopeStats, SimState } from "./types";

export function userStats(positions: Position[]) {
  const won = positions.filter((p) => p.status === "won").length;
  const lost = positions.filter((p) => p.status === "lost").length;
  const voided = positions.filter((p) => p.status === "void").length;
  const open = positions.filter((p) => p.status === "open");
  const settled = positions.filter((p) => p.status !== "open");
  const pnl = settled.reduce((s, p) => s + p.payout - p.stake, 0);
  const decided = won + lost;
  return {
    total: positions.length,
    won,
    lost,
    voided,
    open: open.length,
    openStake: open.reduce((s, p) => s + p.stake, 0),
    pnl,
    accuracy: decided ? won / decided : 0,
  };
}

export const featuredMatch = (s: SimState): Match | undefined =>
  s.matches.find((m) => m.id === s.featuredMatchId) ?? s.matches.find((m) => m.status === "live");

export function lastSettledRound(m: Match) {
  return m.status === "finished" ? m.round.number : m.round.number - 1;
}

export function userScopeStats(state: SimState, scope: Scope): ScopeStats {
  const f = featuredMatch(state);
  const settled = state.user.positions.filter((p) => p.status !== "open");
  let pool = settled;
  if (scope === "round") pool = f ? settled.filter((p) => p.matchId === f.id && p.round === lastSettledRound(f)) : [];
  if (scope === "match") pool = f ? settled.filter((p) => p.matchId === f.id) : [];
  const won = pool.filter((p) => p.status === "won").length;
  const lost = pool.filter((p) => p.status === "lost").length;
  const openStake = state.user.positions.filter((p) => p.status === "open").reduce((s, p) => s + p.stake, 0);
  return {
    points: scope === "global" ? state.user.balance + openStake : pool.reduce((s, p) => s + p.payout - p.stake, 0),
    predictions: won + lost,
    correct: won,
  };
}

export interface LeaderRow {
  id: string;
  username: string;
  country: string;
  isUser: boolean;
  points: number;
  predictions: number;
  accuracy: number;
  rank: number;
}

export function leaderboard(state: SimState, scope: Scope): LeaderRow[] {
  const you = userScopeStats(state, scope);
  const rows = [
    ...state.bots.map((b) => ({ id: b.id, username: b.username, country: b.country, isUser: false, ...b.stats[scope] })),
    { id: "you", username: state.user.username, country: "GH", isUser: true, ...you },
  ];
  return rows
    .map((r) => ({ ...r, accuracy: r.predictions ? r.correct / r.predictions : 0 }))
    .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy)
    .map(({ correct: _c, ...r }, i) => ({ ...r, rank: i + 1 }));
}

export function marketBreakdown(positions: Position[]) {
  const map = new Map<MarketId, { won: number; lost: number; pnl: number }>();
  for (const p of positions) {
    if (p.status === "open") continue;
    const e = map.get(p.market) ?? { won: 0, lost: 0, pnl: 0 };
    if (p.status === "won") e.won++;
    if (p.status === "lost") e.lost++;
    e.pnl += p.payout - p.stake;
    map.set(p.market, e);
  }
  return [...map.entries()].map(([market, v]) => ({ market, ...v }));
}
