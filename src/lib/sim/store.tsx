import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { toast } from "sonner";

import { TICK_MS } from "./constants";
import { advanceMatch, applyEvent, computeQuotes, placePosition, simulateTick, validatePlacement } from "./engine";
import { MARKET_LABELS, fmtPts, selectionLabel } from "./format";
import { createInitialState } from "./initial";
import type { EventType, PlacementInput, Side, SimState } from "./types";
import { SECONDS_PER_TICK, STARTING_BALANCE } from "./constants";

/**
 * Client-side store for the mock market. All mutations go through these actions so a FastAPI +
 * WebSocket backend can later replace TICK/ADMIN_* with server-pushed match snapshots.
 */
export type SimAction =
  | { type: "TICK"; seed: number }
  | { type: "PLACE"; input: PlacementInput }
  | { type: "SET_SPEED"; speed: number }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_USERNAME"; username: string }
  | { type: "RESET_USER" }
  | { type: "ADMIN_POSSESSION"; matchId: string; side: Side; amount: number }
  | { type: "ADMIN_EVENT"; matchId: string; event: EventType; side: Side }
  | { type: "ADMIN_ADVANCE"; matchId: string; seconds: number; seed: number }
  | { type: "ADMIN_CLOSE_ROUND"; matchId: string; seed: number };

function updateMatch(state: SimState, matchId: string, fn: (m: SimState["matches"][number]) => SimState["matches"][number]) {
  return { ...state, matches: state.matches.map((m) => (m.id === matchId && m.status === "live" ? fn(m) : m)) };
}

export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case "TICK":
      return state.paused ? state : simulateTick(state, action.seed);
    case "PLACE":
      return placePosition(state, action.input).state;
    case "SET_SPEED":
      return { ...state, speed: action.speed, paused: false };
    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused };
    case "SET_USERNAME":
      return { ...state, user: { ...state.user, username: action.username } };
    case "RESET_USER":
      return {
        ...state,
        user: { username: state.user.username, balance: STARTING_BALANCE, positions: [], streak: 0, bestStreak: 0, balanceHistory: [STARTING_BALANCE] },
      };
    case "ADMIN_POSSESSION":
      return updateMatch(state, action.matchId, (m) => {
        const dir = action.side === "home" ? 1 : -1;
        const next = { ...m, bias: m.bias + dir * action.amount, index: Math.max(-96, Math.min(96, m.index + dir * action.amount * 0.5)), momentum: m.momentum + dir * 3 };
        return { ...next, quotes: computeQuotes(next) };
      });
    case "ADMIN_EVENT":
      return updateMatch(state, action.matchId, (m) => {
        const next = applyEvent(m, action.event, action.side);
        return { ...next, quotes: computeQuotes(next) };
      });
    case "ADMIN_ADVANCE":
      return advanceMatch(state, action.matchId, Math.round(action.seconds / SECONDS_PER_TICK), action.seed);
    case "ADMIN_CLOSE_ROUND": {
      const m = state.matches.find((x) => x.id === action.matchId);
      if (!m || m.status !== "live") return state;
      return advanceMatch(state, action.matchId, Math.ceil((m.round.end - m.clock) / SECONDS_PER_TICK), action.seed);
    }
  }
}

interface SimContextValue {
  state: SimState;
  dispatch: (a: SimAction) => void;
  place: (input: PlacementInput) => boolean;
}

const SimContext = createContext<SimContextValue | null>(null);
const newSeed = () => Math.floor(Math.random() * 2 ** 32);

export function SimProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simReducer, undefined, () => createInitialState());

  useEffect(() => {
    if (state.paused) return;
    const id = window.setInterval(() => dispatch({ type: "TICK", seed: newSeed() }), TICK_MS / state.speed);
    return () => window.clearInterval(id);
  }, [state.paused, state.speed]);

  // Announce settled predictions.
  useEffect(() => {
    const { batch, items } = state.settlement;
    if (!batch || !items.length) return;
    const net = items.reduce((s, p) => s + p.payout - p.stake, 0);
    if (items.length === 1) {
      const p = items[0];
      const pick = selectionLabel(p.selection, { home: p.homeShort, away: p.awayShort });
      const title = p.status === "won" ? `Won ${fmtPts(p.payout)} pts` : p.status === "lost" ? `Lost ${fmtPts(p.stake)} pts` : "Prediction voided — stake returned";
      const fn = p.status === "won" ? toast.success : p.status === "lost" ? toast.error : toast;
      fn(title, { description: `${MARKET_LABELS[p.market]} · ${pick} · ${p.homeShort} v ${p.awayShort} R${p.round}` });
    } else {
      const fn = net >= 0 ? toast.success : toast.error;
      fn(`${items.length} predictions settled`, { description: `Net ${net >= 0 ? "+" : "−"}${fmtPts(Math.abs(net))} pts` });
    }
  }, [state.settlement]);

  const place = useCallback(
    (input: PlacementInput) => {
      const error = validatePlacement(state, input);
      if (error) {
        toast.error(error);
        return false;
      }
      dispatch({ type: "PLACE", input });
      const m = state.matches.find((x) => x.id === input.matchId)!;
      const q = m.quotes[input.market][input.selection]!;
      toast(`${selectionLabel(input.selection, { home: m.home.short, away: m.away.short })} · ${fmtPts(input.stake)} pts @ ${q.odds.toFixed(2)}`, {
        description: `${MARKET_LABELS[input.market]} · settles at round ${m.round.number} close`,
      });
      return true;
    },
    [state],
  );

  const value = useMemo(() => ({ state, dispatch, place }), [state, place]);
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used inside SimProvider");
  return ctx;
}

export const newAdminSeed = newSeed;
