import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OddsValue } from "@/components/common/odds-value";
import { RoundTimer } from "@/components/trading/round-timer";
import { StakeInput } from "@/components/trading/stake-input";
import { isRoundOpen } from "@/lib/sim/engine";
import { fmtIndex, fmtPct, fmtPts } from "@/lib/sim/format";
import { useSim } from "@/lib/sim/store";
import type { Match } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

export function TradeTicket({ match }: { match: Match }) {
  const { state, place } = useSim();
  const [stake, setStake] = useState(100);
  const open = isRoundOpen(match);
  const buy = match.quotes.possession.buy!;
  const sell = match.quotes.possession.sell!;
  const homeLead = match.index >= 0;
  const trade = (selection: "buy" | "sell") => place({ matchId: match.id, market: "possession", selection, stake });

  return (
    <div className="panel flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-caps">Possession index</div>
          <div className={cn("num mt-1 text-4xl font-bold", homeLead ? "text-bull" : "text-bear")}>{fmtIndex(match.index)}</div>
        </div>
        <div className="text-right">
          <div className="label-caps">In control</div>
          <div className={cn("mt-1 font-display text-lg font-semibold", homeLead ? "text-bull" : "text-bear")}>
            {homeLead ? match.home.short : match.away.short}
          </div>
          <div className="num text-xs text-muted-foreground">{Math.round(match.possession)}% / {Math.round(100 - match.possession)}%</div>
        </div>
      </div>

      <RoundTimer match={match} />
      <StakeInput value={stake} onChange={setStake} balance={state.user.balance} />

      <div className="grid grid-cols-2 gap-2">
        <Button variant="buy" size="xl" disabled={!open} onClick={() => trade("buy")} className="flex-col gap-0.5" aria-label={`Buy ${match.home.name} at ${buy.odds}`}>
          <span className="flex items-center gap-1 font-display text-lg tracking-wide">
            <ArrowUp className="size-5" /> BUY
          </span>
          <span className="num text-xs opacity-80">{match.home.short} · <OddsValue odds={buy.odds} /></span>
        </Button>
        <Button variant="sell" size="xl" disabled={!open} onClick={() => trade("sell")} className="flex-col gap-0.5" aria-label={`Sell to ${match.away.name} at ${sell.odds}`}>
          <span className="flex items-center gap-1 font-display text-lg tracking-wide">
            <ArrowDown className="size-5" /> SELL
          </span>
          <span className="num text-xs opacity-80">{match.away.short} · <OddsValue odds={sell.odds} /></span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-bull-soft px-2.5 py-2">
          <div className="text-muted-foreground">If index rises</div>
          <div className="num font-semibold text-bull">+{fmtPts(Math.round((stake || 0) * buy.odds))} pts</div>
          <div className="num text-[0.65rem] text-muted-foreground">implied {fmtPct(buy.prob)}</div>
        </div>
        <div className="rounded-md bg-bear-soft px-2.5 py-2">
          <div className="text-muted-foreground">If index falls</div>
          <div className="num font-semibold text-bear">+{fmtPts(Math.round((stake || 0) * sell.odds))} pts</div>
          <div className="num text-[0.65rem] text-muted-foreground">implied {fmtPct(sell.prob)}</div>
        </div>
      </div>
      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        BUY predicts {match.home.short} pushes the index up by round close; SELL predicts {match.away.short} drags it down. Settled against your entry level. Virtual points only.
      </p>
    </div>
  );
}
