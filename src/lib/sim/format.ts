import type { MarketId, Match, Position, Selection } from "./types";

export const MARKET_LABELS: Record<MarketId, string> = {
  possession: "Possession",
  nextGoal: "Next goal",
  nextCorner: "Next corner",
  nextShot: "Next shot",
  redCard: "Red card",
  injury: "Injury",
  goal5: "Goal this round",
};

export const fmtPts = (n: number) => Math.round(n).toLocaleString("en-US");
export const fmtSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmtPts(Math.abs(n))}`;
export const fmtPct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const fmtOdds = (n: number) => n.toFixed(2);
export const fmtIndex = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}`;

/** Match clock as mm:ss. */
export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export const fmtMinute = (sec: number) => `${Math.min(90, Math.floor(sec / 60) + 1)}'`;

export function selectionLabel(
  sel: Selection,
  teams: { home: string; away: string },
): string {
  switch (sel) {
    case "buy":
      return `HOME ${teams.home}`;
    case "sell":
      return `AWAY ${teams.away}`;
    case "home":
      return teams.home;
    case "away":
      return teams.away;
    case "yes":
      return "Yes";
    case "no":
      return "No";
  }
}

export const positionPick = (p: Position) =>
  selectionLabel(p.selection, { home: p.homeShort, away: p.awayShort });

export const matchTeams = (m: Match) => ({ home: m.home.short, away: m.away.short });
