import { Input } from "@/components/ui/input";
import { MIN_STAKE } from "@/lib/sim/constants";
import { fmtPts } from "@/lib/sim/format";
import { cn } from "@/lib/utils";

const CHIPS = [50, 100, 250, 500];

export function StakeInput({ value, onChange, balance }: { value: number; onChange: (v: number) => void; balance: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor="stake" className="label-caps">
          Stake (pts)
        </label>
        <span className="num text-[0.7rem] text-muted-foreground">Bal {fmtPts(balance)}</span>
      </div>
      <Input
        id="stake"
        type="number"
        inputMode="numeric"
        min={MIN_STAKE}
        step={10}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Math.floor(Number(e.target.value)))}
        className="num h-10 bg-surface text-base"
      />
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "num rounded-md border border-border bg-surface-raised py-1 text-xs transition-colors hover:bg-accent",
              value === c && "border-primary/60 text-primary",
            )}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(Math.floor(balance))}
          className="rounded-md border border-border bg-surface-raised py-1 font-mono text-xs transition-colors hover:bg-accent"
        >
          MAX
        </button>
      </div>
    </div>
  );
}
