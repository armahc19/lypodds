export type Side = "home" | "away";
export type EventType = "goal" | "corner" | "shot" | "red" | "injury";
export type MarketId =
  | "possession"
  | "nextGoal"
  | "nextCorner"
  | "nextShot"
  | "redCard"
  | "injury"
  | "goal5";
export type Selection = "buy" | "sell" | "home" | "away" | "yes" | "no";
export type MatchStatus = "live" | "upcoming" | "finished";
export type PositionStatus = "open" | "won" | "lost" | "void";
export type Scope = "round" | "match" | "daily" | "global";

export interface Team {
  id: string;
  name: string;
  short: string;
  /** 0-100 rating used to bias possession and event sides. */
  strength: number;
}

export interface Pair {
  home: number;
  away: number;
}

export interface MatchEvent {
  id: string;
  /** Monotonic per match; positions settle on events with seq greater than placedSeq. */
  seq: number;
  clock: number;
  type: EventType;
  side: Side;
}

export interface SeriesPoint {
  t: number;
  v: number;
}

export interface Quote {
  prob: number;
  odds: number;
}

export type MarketQuotes = Record<MarketId, Partial<Record<Selection, Quote>>>;

export interface Round {
  number: number;
  start: number;
  end: number;
}

export interface Match {
  id: string;
  league: string;
  venue: string;
  home: Team;
  away: Team;
  status: MatchStatus;
  /** Match clock in seconds (0-5400). */
  clock: number;
  score: Pair;
  shots: Pair;
  corners: Pair;
  reds: Pair;
  injuries: Pair;
  /** Home possession percentage. */
  possession: number;
  /** Possession index: +100 = full Home control, -100 = full Away control. */
  index: number;
  momentum: number;
  /** Temporary push applied by admin controls or red cards; decays every tick. */
  bias: number;
  series: SeriesPoint[];
  events: MatchEvent[];
  eventSeq: number;
  round: Round;
  quotes: MarketQuotes;
}

export interface Position {
  id: string;
  matchId: string;
  matchLabel: string;
  homeShort: string;
  awayShort: string;
  round: number;
  market: MarketId;
  selection: Selection;
  stake: number;
  odds: number;
  entryIndex: number;
  placedClock: number;
  placedSeq: number;
  status: PositionStatus;
  payout: number;
  exitIndex?: number;
}

export interface UserState {
  username: string;
  balance: number;
  /** Newest first. */
  positions: Position[];
  streak: number;
  bestStreak: number;
  balanceHistory: number[];
}

export interface ScopeStats {
  points: number;
  predictions: number;
  correct: number;
}

export interface Bot {
  id: string;
  username: string;
  country: string;
  skill: number;
  stats: Record<Scope, ScopeStats>;
}

export interface SimState {
  matches: Match[];
  user: UserState;
  bots: Bot[];
  featuredMatchId: string;
  fixtureCursor: number;
  matchCounter: number;
  positionCounter: number;
  settlement: { batch: number; items: Position[] };
  speed: number;
  paused: boolean;
}

export interface PlacementInput {
  matchId: string;
  market: MarketId;
  selection: Selection;
  stake: number;
}
