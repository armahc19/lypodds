import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmtOdds } from "@/lib/sim/format";

/** Odds that flash green/red when they move. */
export function OddsValue({ odds, className }: { odds: number; className?: string }) {
  const prev = useRef(odds);
  const [flash, setFlash] = useState<{ dir: "up" | "down"; key: number } | null>(null);
  useEffect(() => {
    if (odds !== prev.current) {
      setFlash({ dir: odds > prev.current ? "up" : "down", key: Date.now() });
      prev.current = odds;
    }
  }, [odds]);
  return (
    <span
      key={flash?.key}
      className={cn(
        "num rounded px-1",
        flash?.dir === "up" && "animate-flash-up",
        flash?.dir === "down" && "animate-flash-down",
        className,
      )}
    >
      {fmtOdds(odds)}
    </span>
  );
}
