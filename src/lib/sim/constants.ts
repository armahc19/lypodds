/** Simulation timing: one real tick advances the match clock by SECONDS_PER_TICK match-seconds. */
export const TICK_MS = 500;
export const SECONDS_PER_TICK = 5;
/** A trading round is five match-minutes. */
export const ROUND_SECONDS = 300;
/** Predictions lock this many match-seconds before a round closes. */
export const LOCK_SECONDS = 60;
export const MATCH_SECONDS = 90 * 60;
export const TOTAL_ROUNDS = MATCH_SECONDS / ROUND_SECONDS;
export const STARTING_BALANCE = 10_000;
export const MIN_STAKE = 10;
/** Bookmaker margin applied to fair odds (odds = MARGIN / probability). */
export const MARGIN = 0.94;
export const MIN_ODDS = 1.01;
export const SERIES_CAP = 240;
export const EVENTS_CAP = 120;
export const INITIAL_SEED = 20261116;
