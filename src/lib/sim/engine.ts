/**
 * Pure simulation engine. Every function here is deterministic given its inputs (including the
 * injected Rng), so it can be unit-tested and later swapped for a WebSocket feed from a backend.
 */
import {
  EVENTS_CAP,
  LOCK_SECONDS,
  MARGIN,
  MATCH_SECONDS,
  MIN_ODDS,
  MIN_STAKE,
  ROUND_SECONDS,
  SECONDS_PER_TICK,
  SERIES_CAP,
  TOTAL_ROUNDS,
} from "./constants";
import { FIXTURES, type Fixture } from "./data";
import { between, intBetween, mulberry32, type Rng } from "./rng";
import type {
  Bot,
  EventType,
  MarketQuotes,
  Match,
  MatchStatus,
  PlacementInput,
  Position,
  Round,
  Scope,
  ScopeStats,
  Side,
  SimState,
  UserState,
} from "./types";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Per-match-second base rates for each event type (realistic football averages). */
export const EVENT_RATES: Record<EventType, number> = {
  shot: 26 / MATCH_SECONDS,
  corner: 10 / MATCH_SECONDS,
  goal: 2.8 / MATCH_SECONDS,
  red: 0.2 / MATCH_SECONDS,
  injury: 2 / MATCH_SECONDS,
};

export function toQuote(prob: number) {
  const p = clamp(prob, 0.02, 0.98);
  return { prob: p, odds: Math.max(MIN_ODDS, round2(MARGIN / p)) };
}

export function roundAt(clock: number): Round {
  const number = Math.min(Math.floor(clock / ROUND_SECONDS) + 1, TOTAL_ROUNDS);
  const start = (number - 1) * ROUND_SECONDS;
  return { number, start, end: start + ROUND_SECONDS };
}

export const roundRemaining = (m: Match) => Math.max(0, m.round.end - m.clock);
export const isRoundOpen = (m: Match) =>
  m.status === "live" && m.round.end - m.clock > LOCK_SECONDS;

const strengthShare = (m: Match) => m.home.strength / (m.home.strength + m.away.strength);
const intensity = (m: Match) => 1 + Math.abs(m.index) / 200;

/** Probability that the next event of this type goes to the Home side. */
export function homeShare(m: Match, type: EventType) {
  const s = strengthShare(m);
  if (type === "red" || type === "injury") return clamp(0.5 - m.index * 0.0015, 0.2, 0.8);
  const w = type === "corner" ? 0.004 : type === "shot" ? 0.0045 : 0.003;
  return clamp(0.5 + (s - 0.5) * 1.5 + m.index * w, 0.1, 0.9);
}

/** Probability that at least one event of this type happens before the round closes. */
export function chanceInRound(m: Match, type: EventType) {
  return 1 - Math.exp(-EVENT_RATES[type] * intensity(m) * roundRemaining(m));
}

export function computeQuotes(m: Match, rng?: Rng): MarketQuotes {
  const j = () => (rng ? (rng() - 0.5) * 0.03 : 0);
  const buy = clamp(0.5 + m.momentum * 0.03 - m.index * 0.0025 + j(), 0.22, 0.78);
  const goal = clamp(homeShare(m, "goal") + j(), 0.08, 0.92);
  const corner = clamp(homeShare(m, "corner") + j(), 0.08, 0.92);
  const shot = clamp(homeShare(m, "shot") + j(), 0.08, 0.92);
  const red = chanceInRound(m, "red") * (1 + j());
  const injury = chanceInRound(m, "injury") * (1 + j());
  const goal5 = chanceInRound(m, "goal") * (1 + j() * 2);
  return {
    possession: { buy: toQuote(buy), sell: toQuote(1 - buy) },
    nextGoal: { home: toQuote(goal), away: toQuote(1 - goal) },
    nextCorner: { home: toQuote(corner), away: toQuote(1 - corner) },
    nextShot: { home: toQuote(shot), away: toQuote(1 - shot) },
    redCard: { yes: toQuote(red), no: toQuote(1 - red) },
    injury: { yes: toQuote(injury), no: toQuote(1 - injury) },
    goal5: { yes: toQuote(goal5), no: toQuote(1 - goal5) },
  };
}

const bump = (p: { home: number; away: number }, side: Side) => ({ ...p, [side]: p[side] + 1 });

function recordEvent(m: Match, type: EventType, side: Side): Match {
  const seq = m.eventSeq + 1;
  return {
    ...m,
    eventSeq: seq,
    events: [...m.events, { id: `${m.id}-e${seq}`, seq, clock: m.clock, type, side }].slice(
      -EVENTS_CAP,
    ),
  };
}

/** Apply a match event (from the simulation or admin controls) and its effect on possession. */
export function applyEvent(m: Match, type: EventType, side: Side): Match {
  const dir = side === "home" ? 1 : -1;
  let next = m;
  switch (type) {
    case "goal":
      next = recordEvent(next, "shot", side);
      next = recordEvent(next, "goal", side);
      next = { ...next, score: bump(next.score, side), shots: bump(next.shots, side), index: clamp(next.index - dir * 10, -96, 96) };
      break;
    case "shot":
      next = recordEvent(next, "shot", side);
      next = { ...next, shots: bump(next.shots, side), index: clamp(next.index + dir * 5, -96, 96) };
      break;
    case "corner":
      next = recordEvent(next, "corner", side);
      next = { ...next, corners: bump(next.corners, side), index: clamp(next.index + dir * 8, -96, 96) };
      break;
    case "red":
      next = recordEvent(next, "red", side);
      next = { ...next, reds: bump(next.reds, side), bias: next.bias - dir * 25 };
      break;
    case "injury":
      next = recordEvent(next, "injury", side);
      next = { ...next, injuries: bump(next.injuries, side) };
      break;
  }
  return next;
}

/** Advance one live match by one tick: possession random walk, random events, fresh quotes. */
export function stepMatch(m: Match, rng: Rng): Match {
  if (m.status !== "live") return m;
  const target = clamp((strengthShare(m) - 0.5) * 200 + 4 + m.bias, -80, 80);
  let momentum = m.momentum * 0.82 + (rng() - 0.5) * 7 + (target - m.index) * 0.025;
  const index = clamp(m.index + momentum, -96, 96);
  if (Math.abs(index) >= 96) momentum *= -0.3;
  let next: Match = {
    ...m,
    clock: Math.min(m.clock + SECONDS_PER_TICK, MATCH_SECONDS),
    momentum,
    index,
    bias: m.bias * 0.96,
    possession: clamp(m.possession * 0.97 + (50 + index * 0.3) * 0.03, 20, 80),
  };
  const types: EventType[] = ["shot", "corner", "goal", "red", "injury"];
  for (const type of types) {
    if (rng() < EVENT_RATES[type] * intensity(next) * SECONDS_PER_TICK) {
      next = applyEvent(next, type, rng() < homeShare(next, type) ? "home" : "away");
    }
  }
  next = {
    ...next,
    series: [...m.series, { t: next.clock, v: round1(next.index) }].slice(-SERIES_CAP),
  };
  return { ...next, quotes: computeQuotes(next, rng) };
}

/** Resolve one position against the match state at round close. */
export function settlePosition(p: Position, m: Match): Position {
  const after = m.events.filter((e) => e.seq > p.placedSeq);
  const first = (type: EventType) => after.find((e) => e.type === type);
  let status: Position["status"];
  switch (p.market) {
    case "possession": {
      const diff = round1(m.index) - p.entryIndex;
      status = diff === 0 ? "void" : diff > 0 === (p.selection === "buy") ? "won" : "lost";
      break;
    }
    case "nextGoal":
    case "nextCorner":
    case "nextShot": {
      const type: EventType =
        p.market === "nextGoal" ? "goal" : p.market === "nextCorner" ? "corner" : "shot";
      const ev = first(type);
      status = !ev ? "void" : ev.side === p.selection ? "won" : "lost";
      break;
    }
    default: {
      const type: EventType = p.market === "redCard" ? "red" : p.market === "injury" ? "injury" : "goal";
      const happened = Boolean(first(type));
      status = happened === (p.selection === "yes") ? "won" : "lost";
    }
  }
  const payout = status === "won" ? Math.round(p.stake * p.odds) : status === "void" ? p.stake : 0;
  return { ...p, status, payout, exitIndex: round1(m.index) };
}

export function settleMatchPositions(user: UserState, m: Match) {
  let { balance, streak, bestStreak } = user;
  const settled: Position[] = [];
  // Settle oldest first so the streak follows placement order.
  const ordered = [...user.positions].reverse().map((p) => {
    if (p.status !== "open" || p.matchId !== m.id) return p;
    const s = settlePosition(p, m);
    settled.push(s);
    balance += s.payout;
    if (s.status === "won") {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else if (s.status === "lost") streak = 0;
    return s;
  });
  if (!settled.length) return { user, settled };
  return {
    user: {
      ...user,
      balance,
      streak,
      bestStreak,
      positions: ordered.reverse(),
      balanceHistory: [...user.balanceHistory, balance].slice(-200),
    },
    settled,
  };
}

export function validatePlacement(state: SimState, input: PlacementInput): string | null {
  const m = state.matches.find((x) => x.id === input.matchId);
  if (!m) return "Match not found";
  if (m.status !== "live") return "This match is not live";
  if (!isRoundOpen(m)) return `Round ${m.round.number} is locked — wait for the next round`;
  if (!Number.isInteger(input.stake)) return "Enter a whole number of points";
  if (input.stake < MIN_STAKE) return `Minimum stake is ${MIN_STAKE} pts`;
  if (input.stake > state.user.balance) return "Not enough virtual points";
  if (!m.quotes[input.market]?.[input.selection]) return "Invalid selection";
  return null;
}

export function placePosition(state: SimState, input: PlacementInput) {
  const error = validatePlacement(state, input);
  if (error) return { state, error };
  const m = state.matches.find((x) => x.id === input.matchId)!;
  const quote = m.quotes[input.market][input.selection]!;
  const position: Position = {
    id: `p${state.positionCounter + 1}`,
    matchId: m.id,
    matchLabel: `${m.home.name} v ${m.away.name}`,
    homeShort: m.home.short,
    awayShort: m.away.short,
    round: m.round.number,
    market: input.market,
    selection: input.selection,
    stake: input.stake,
    odds: quote.odds,
    entryIndex: round1(m.index),
    placedClock: m.clock,
    placedSeq: m.eventSeq,
    status: "open",
    payout: 0,
  };
  const balance = state.user.balance - input.stake;
  return {
    state: {
      ...state,
      positionCounter: state.positionCounter + 1,
      user: {
        ...state.user,
        balance,
        positions: [position, ...state.user.positions],
        balanceHistory: [...state.user.balanceHistory, balance].slice(-200),
      },
    },
    position,
  };
}

/* ---------- Match creation & rotation ---------- */

const emptyPair = () => ({ home: 0, away: 0 });

export function createMatch(
  id: string,
  fixture: Fixture,
  clock: number,
  status: MatchStatus,
  rng: Rng,
): Match {
  let m: Match = {
    id,
    league: fixture.league,
    venue: fixture.venue,
    home: fixture.home,
    away: fixture.away,
    status: "live",
    clock: 0,
    score: emptyPair(),
    shots: emptyPair(),
    corners: emptyPair(),
    reds: emptyPair(),
    injuries: emptyPair(),
    possession: 50,
    index: 0,
    momentum: 0,
    bias: 0,
    series: [{ t: 0, v: 0 }],
    events: [],
    eventSeq: 0,
    round: roundAt(0),
    quotes: {} as MarketQuotes,
  };
  const steps = Math.round(clock / SECONDS_PER_TICK);
  for (let i = 0; i < steps; i++) m = stepMatch(m, rng);
  m = { ...m, status, round: roundAt(m.clock) };
  return { ...m, quotes: computeQuotes(m) };
}

function nextFixture(state: SimState) {
  const inUse = new Set(state.matches.map((m) => m.home.id));
  for (let i = 0; i < FIXTURES.length; i++) {
    const idx = (state.fixtureCursor + i) % FIXTURES.length;
    const f = FIXTURES[idx]!;
    if (!inUse.has(f.home.id)) return { fixture: f, cursor: idx + 1 };
  }
  const idx = state.fixtureCursor % FIXTURES.length;
  return { fixture: FIXTURES[idx]!, cursor: idx + 1 };
}

/** Advance one match by one tick, closing/settling the round and rotating fixtures as needed. */
export function progressMatch(state: SimState, matchId: string, rng: Rng) {
  const current = state.matches.find((m) => m.id === matchId);
  if (!current || current.status !== "live") return { state, settled: [] as Position[] };
  let m = stepMatch(current, rng);
  let { user, bots, featuredMatchId } = state;
  let settled: Position[] = [];
  if (m.clock >= m.round.end) {
    const res = settleMatchPositions(user, m);
    user = res.user;
    settled = res.settled;
    if (m.clock >= MATCH_SECONDS) m = { ...m, status: "finished" };
    else {
      m = { ...m, round: roundAt(m.clock) };
      m = { ...m, quotes: computeQuotes(m) };
    }
    if (m.id === featuredMatchId) bots = resetBotScope(bots, "round", rng);
  }
  let next: SimState = {
    ...state,
    user,
    bots,
    matches: state.matches.map((x) => (x.id === m.id ? m : x)),
  };
  if (m.status === "finished") {
    const upcoming = next.matches.find((x) => x.status === "upcoming");
    const { fixture, cursor } = nextFixture(next);
    const matchCounter = next.matchCounter + 1;
    let matches = next.matches.map((x) =>
      upcoming && x.id === upcoming.id ? { ...x, status: "live" as const } : x,
    );
    matches = [...matches, createMatch(`m${matchCounter}`, fixture, 0, "upcoming", rng)];
    const finished = matches.filter((x) => x.status === "finished");
    if (finished.length > 3) {
      const drop = new Set(finished.slice(0, finished.length - 3).map((x) => x.id));
      matches = matches.filter((x) => !drop.has(x.id));
    }
    if (featuredMatchId === m.id) {
      featuredMatchId = matches.find((x) => x.status === "live")?.id ?? m.id;
      bots = resetBotScope(resetBotScope(next.bots, "round", rng), "match", rng);
    }
    next = { ...next, matches, matchCounter, fixtureCursor: cursor, featuredMatchId, bots };
  }
  return { state: next, settled };
}

/* ---------- Leaderboard bots ---------- */

export function randomScopeStats(scope: Scope, skill: number, rng: Rng): ScopeStats {
  const ranges: Record<Scope, [number, number, number, number]> = {
    round: [-500, 1200, 0, 5],
    match: [-900, 2600, 2, 18],
    daily: [-1500, 6500, 8, 60],
    global: [12000, 95000, 80, 900],
  };
  const [pMin, pMax, nMin, nMax] = ranges[scope];
  const predictions = intBetween(rng, nMin, nMax);
  const acc = clamp(0.38 + skill * 0.3 + (rng() - 0.5) * 0.12, 0, 1);
  const skew = 0.35 + skill * 0.65;
  return {
    points: Math.round(between(rng, pMin, pMin + (pMax - pMin) * skew) / 10) * 10,
    predictions,
    correct: Math.round(predictions * acc),
  };
}

export function resetBotScope(bots: Bot[], scope: Scope, rng: Rng): Bot[] {
  return bots.map((b) => ({ ...b, stats: { ...b.stats, [scope]: randomScopeStats(scope, b.skill, rng) } }));
}

export function updateBots(bots: Bot[], rng: Rng): Bot[] {
  return bots.map((b) => {
    if (rng() > 0.05) return b;
    const win = rng() < 0.42 + b.skill * 0.22;
    const stake = Math.round((50 + rng() * 450) / 10) * 10;
    const delta = win ? Math.round(stake * (0.5 + rng())) : -stake;
    const add = (s: ScopeStats, floor?: number) => ({
      points: floor === undefined ? s.points + delta : Math.max(floor, s.points + delta),
      predictions: s.predictions + 1,
      correct: s.correct + (win ? 1 : 0),
    });
    return {
      ...b,
      stats: { ...b.stats, match: add(b.stats.match), daily: add(b.stats.daily), global: add(b.stats.global, 0) },
    };
  });
}

/* ---------- Tick orchestration ---------- */

export function simulateTick(state: SimState, seed: number): SimState {
  const rng = mulberry32(seed);
  let next = state;
  const settled: Position[] = [];
  for (const m of state.matches) {
    if (m.status !== "live") continue;
    const res = progressMatch(next, m.id, rng);
    next = res.state;
    settled.push(...res.settled);
  }
  next = { ...next, bots: updateBots(next.bots, rng) };
  if (settled.length) {
    next = { ...next, settlement: { batch: state.settlement.batch + 1, items: settled } };
  }
  return next;
}

/** Run a single match forward by N ticks (admin clock controls). */
export function advanceMatch(state: SimState, matchId: string, ticks: number, seed: number) {
  const rng = mulberry32(seed);
  let next = state;
  const settled: Position[] = [];
  for (let i = 0; i < ticks; i++) {
    const res = progressMatch(next, matchId, rng);
    next = res.state;
    settled.push(...res.settled);
  }
  if (settled.length) {
    next = { ...next, settlement: { batch: state.settlement.batch + 1, items: settled } };
  }
  return next;
}
