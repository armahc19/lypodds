import { INITIAL_SEED, STARTING_BALANCE } from "./constants";
import { BOT_PROFILES, FIXTURES } from "./data";
import { createMatch, randomScopeStats } from "./engine";
import { mulberry32 } from "./rng";
import type { Bot, MarketId, Position, Selection, SimState, UserState } from "./types";

type SeedPick = [MarketId, Selection, number, number, "won" | "lost", number];

/** Prior trading history on the finished Liverpool v Man City match, so the portfolio isn't empty. */
const SEEDED_HISTORY: SeedPick[] = [
  ["possession", "buy", 200, 1.82, "won", 2],
  ["nextCorner", "home", 150, 1.74, "won", 3],
  ["goal5", "no", 300, 1.12, "won", 5],
  ["possession", "sell", 250, 1.95, "lost", 6],
  ["nextGoal", "away", 100, 2.3, "won", 8],
  ["redCard", "no", 200, 1.01, "won", 9],
  ["possession", "buy", 400, 1.76, "lost", 11],
  ["nextShot", "home", 150, 1.68, "won", 13],
  ["injury", "yes", 100, 8.4, "lost", 15],
  ["possession", "sell", 300, 1.88, "won", 17],
];

function seededUser(matchId: string, label: string, homeShort: string, awayShort: string): UserState {
  let balance = STARTING_BALANCE;
  let streak = 0;
  let bestStreak = 0;
  const history = [balance];
  const positions: Position[] = SEEDED_HISTORY.map(([market, selection, stake, odds, status, round], i) => {
    const payout = status === "won" ? Math.round(stake * odds) : 0;
    balance += payout - stake;
    history.push(balance);
    if (status === "won") {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else streak = 0;
    return {
      id: `h${i + 1}`,
      matchId,
      matchLabel: label,
      homeShort,
      awayShort,
      round,
      market,
      selection,
      stake,
      odds,
      entryIndex: 0,
      placedClock: (round - 1) * 300 + 60,
      placedSeq: 0,
      status,
      payout,
    };
  }).reverse();
  return { username: "you", balance, positions, streak, bestStreak, balanceHistory: history };
}

export function createInitialState(seed = INITIAL_SEED): SimState {
  const rng = mulberry32(seed);
  const finished = createMatch("m0", FIXTURES[6]!, 5400, "finished", rng);
  const matches = [
    createMatch("m1", FIXTURES[0]!, 2045, "live", rng),
    createMatch("m2", FIXTURES[1]!, 3660, "live", rng),
    createMatch("m3", FIXTURES[2]!, 720, "live", rng),
    createMatch("m4", FIXTURES[3]!, 4680, "live", rng),
    createMatch("m5", FIXTURES[4]!, 0, "upcoming", rng),
    createMatch("m6", FIXTURES[5]!, 0, "upcoming", rng),
    finished,
  ];
  const bots: Bot[] = BOT_PROFILES.map((p, i) => {
    const skill = rng();
    return {
      id: `b${i + 1}`,
      username: p.username,
      country: p.country,
      skill,
      stats: {
        round: randomScopeStats("round", skill, rng),
        match: randomScopeStats("match", skill, rng),
        daily: randomScopeStats("daily", skill, rng),
        global: randomScopeStats("global", skill, rng),
      },
    };
  });
  return {
    matches,
    user: seededUser(finished.id, `${finished.home.name} v ${finished.away.name}`, finished.home.short, finished.away.short),
    bots,
    featuredMatchId: "m1",
    fixtureCursor: 7,
    matchCounter: 6,
    positionCounter: 0,
    settlement: { batch: 0, items: [] },
    speed: 1,
    paused: false,
  };
}
