import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OddsValue } from "@/components/common/odds-value";
import { StakeInput } from "@/components/trading/stake-input";
import { isRoundOpen } from "@/lib/sim/engine";
import { MARKET_LABELS, fmtOdds, fmtPct, fmtPts, selectionLabel } from "@/lib/sim/format";
import { useSim } from "@/lib/sim/store";
import type { MarketId, Match, Selection } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export const EVENT_MARKETS: { id: MarketId; selections: [Selection, Selection]; hint: string }[] = [
  { id: "nextGoal", selections: ["home", "away"], hint: "First goal after you predict, this round. Void if none." },
  { id: "nextCorner", selections: ["home", "away"], hint: "First corner after you predict, this round." },
  { id: "nextShot", selections: ["home", "away"], hint: "First shot after you predict, this round." },
  { id: "redCard", selections: ["yes", "no"], hint: "Any red card before the round closes." },
  { id: "injury", selections: ["yes", "no"], hint: "Any injury stoppage before the round closes." },
  { id: "goal5", selections: ["yes", "no"], hint: "Any goal within this five-minute round." },
];

export function EventMarkets({ match }: { match: Match }) {
  const { state, place } = useSim();
  const [pick, setPick] = useState<{ market: MarketId; selection: Selection } | null>(null);
  const [stake, setStake] = useState(100);
  const open = isRoundOpen(match);
  const teams = { home: match.home.short, away: match.away.short };
  const quote = pick ? match.quotes[pick.market][pick.selection] : undefined;

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Event prediction markets</h2>
        <span className="label-caps">Round {match.round.number}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {EVENT_MARKETS.map((mk) => (
          <div key={mk.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-sm font-semibold">{MARKET_LABELS[mk.id]}</span>
            </div>
            <p className="mt-0.5 text-[0.68rem] leading-snug text-muted-foreground">{mk.hint}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {mk.selections.map((sel) => {
                const q = match.quotes[mk.id][sel]!;
                const active = pick?.market === mk.id && pick.selection === sel;
                const tone = sel === "home" ? "bull" : sel === "away" ? "bear" : "neutral";
                return (
                  <button
                    key={sel}
                    type="button"
                    disabled={!open}
                    onClick={() => setPick(active ? null : { market: mk.id, selection: sel })}
                    className={cn(
                      "group relative overflow-hidden rounded-md border bg-surface-raised px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      "border-border hover:border-muted-foreground/50",
                      active && tone === "bull" && "border-bull bg-bull-soft",
                      active && tone === "bear" && "border-bear bg-bear-soft",
                      active && tone === "neutral" && "border-primary bg-primary/10",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-medium", tone === "bull" && "text-bull", tone === "bear" && "text-bear")}>
                        {selectionLabel(sel, teams)}
                      </span>
                      <OddsValue odds={q.odds} className="text-sm font-semibold" />
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-500", tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : "bg-primary")}
                        style={{ width: `${q.prob * 100}%` }}
                      />
                    </div>
                    <div className="num mt-1 text-[0.62rem] text-muted-foreground">{fmtPct(q.prob)} implied</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pick && quote && (
        <div className="mt-3 grid gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
          <div>
            <div className="label-caps">Prediction slip</div>
            <div className="mt-1 font-display font-semibold">
              {MARKET_LABELS[pick.market]} · {selectionLabel(pick.selection, teams)}
            </div>
            <div className="num text-xs text-muted-foreground">
              @ {fmtOdds(quote.odds)} · returns {fmtPts(Math.round((stake || 0) * quote.odds))} pts
            </div>
          </div>
          <StakeInput value={stake} onChange={setStake} balance={state.user.balance} />
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setPick(null)} aria-label="Clear slip">
              <X />
            </Button>
            <Button
              variant="brand"
              size="lg"
              disabled={!open}
              onClick={() => {
                if (place({ matchId: match.id, market: pick.market, selection: pick.selection, stake })) setPick(null);
              }}
            >
              Place prediction
            </Button>
          </div>
        </div>
      )}
      {!open && match.status === "live" && (
        <p className="mt-3 text-xs text-primary">Round {match.round.number} is locked. Markets reopen when the next round starts.</p>
      )}
    </div>
  );
}
