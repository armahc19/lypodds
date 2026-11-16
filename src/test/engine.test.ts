import { describe, expect, it } from "vitest";

import { LOCK_SECONDS, MIN_STAKE, ROUND_SECONDS } from "@/lib/sim/constants";
import { applyEvent, isRoundOpen, placePosition, progressMatch, settlePosition, toQuote, validatePlacement } from "@/lib/sim/engine";
import { createInitialState } from "@/lib/sim/initial";
import { mulberry32 } from "@/lib/sim/rng";
import type { Match, SimState } from "@/lib/sim/types";

function liveState(): { state: SimState; match: Match } {
  const state = createInitialState();
  // Put the featured match at the very start of a round so trading is open.
  const match = { ...state.matches.find((m) => m.id === "m1")!, clock: 1800, round: { number: 7, start: 1800, end: 2100 } };
  return { state: { ...state, matches: state.matches.map((m) => (m.id === match.id ? match : m)) }, match };
}

describe("odds", () => {
  it("prices odds as 0.94 / probability", () => {
    expect(toQuote(0.5).odds).toBe(1.88);
    expect(toQuote(0.25).odds).toBe(3.76);
  });
});

describe("possession BUY / SELL", () => {
  it("BUY wins when the index rises and pays stake × odds", () => {
    const { state } = liveState();
    const { position } = placePosition(state, { matchId: "m1", market: "possession", selection: "buy", stake: 100 });
    const settled = settlePosition(position!, { ...state.matches[0], index: position!.entryIndex + 5 });
    expect(settled.status).toBe("won");
    expect(settled.payout).toBe(Math.round(100 * position!.odds));
  });

  it("SELL loses when the index rises", () => {
    const { state } = liveState();
    const { position } = placePosition(state, { matchId: "m1", market: "possession", selection: "sell", stake: 100 });
    expect(settlePosition(position!, { ...state.matches[0], index: position!.entryIndex + 5 }).status).toBe("lost");
  });

  it("refunds the stake when the index ends exactly where it started", () => {
    const { state } = liveState();
    const { position } = placePosition(state, { matchId: "m1", market: "possession", selection: "buy", stake: 100 });
    const s = settlePosition(position!, { ...state.matches[0], index: position!.entryIndex });
    expect(s.status).toBe("void");
    expect(s.payout).toBe(100);
  });
});

describe("event markets", () => {
  it("next goal ignores goals scored before the prediction", () => {
    const { state, match } = liveState();
    const before = applyEvent(match, "goal", "away");
    const s1 = { ...state, matches: state.matches.map((m) => (m.id === "m1" ? before : m)) };
    const { position } = placePosition(s1, { matchId: "m1", market: "nextGoal", selection: "home", stake: 50 });
    expect(settlePosition(position!, before).status).toBe("void");
    expect(settlePosition(position!, applyEvent(before, "goal", "home")).status).toBe("won");
  });

  it("goal this round: No wins when no goal is scored", () => {
    const { state, match } = liveState();
    const { position } = placePosition(state, { matchId: "m1", market: "goal5", selection: "no", stake: 50 });
    expect(settlePosition(position!, applyEvent(match, "corner", "home")).status).toBe("won");
  });
});

describe("placement rules", () => {
  it("locks predictions in the final minute of a round", () => {
    const { match } = liveState();
    expect(isRoundOpen({ ...match, clock: match.round.end - LOCK_SECONDS - 5 })).toBe(true);
    expect(isRoundOpen({ ...match, clock: match.round.end - LOCK_SECONDS })).toBe(false);
  });

  it("rejects stakes below the minimum or above the balance", () => {
    const { state } = liveState();
    const base = { matchId: "m1", market: "possession" as const, selection: "buy" as const };
    expect(validatePlacement(state, { ...base, stake: MIN_STAKE - 1 })).toMatch(/Minimum/);
    expect(validatePlacement(state, { ...base, stake: state.user.balance + 1 })).toMatch(/Not enough/);
    expect(validatePlacement(state, { ...base, stake: MIN_STAKE })).toBeNull();
  });

  it("deducts the stake from the balance when placed", () => {
    const { state } = liveState();
    const { state: next } = placePosition(state, { matchId: "m1", market: "possession", selection: "buy", stake: 250 });
    expect(next.user.balance).toBe(state.user.balance - 250);
  });
});

describe("five-minute rounds", () => {
  it("settles open positions and opens the next round when the round closes", () => {
    const { state, match } = liveState();
    const nearEnd = { ...match, clock: match.round.end - 5 };
    const s1 = { ...state, matches: state.matches.map((m) => (m.id === "m1" ? { ...nearEnd } : m)) };
    // Place while open (bypass lock by placing on the open-round state first).
    const { state: placed } = placePosition(state, { matchId: "m1", market: "possession", selection: "buy", stake: 100 });
    const ready = { ...placed, matches: s1.matches };
    const { state: after, settled } = progressMatch(ready, "m1", mulberry32(1));
    const m = after.matches.find((x) => x.id === "m1")!;
    expect(settled).toHaveLength(1);
    expect(settled[0].status).not.toBe("open");
    expect(m.round.number).toBe(match.round.number + 1);
    expect(m.round.end - m.round.start).toBe(ROUND_SECONDS);
  });
});
