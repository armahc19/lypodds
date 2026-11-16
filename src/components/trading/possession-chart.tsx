import { useId } from "react";

import { useElementSize } from "@/hooks/use-element-size";
import { LOCK_SECONDS, ROUND_SECONDS } from "@/lib/sim/constants";
import { fmtIndex, fmtPts } from "@/lib/sim/format";
import type { Match, Position } from "@/lib/sim/types";
import { cn } from "@/lib/utils";

const WINDOW = ROUND_SECONDS * 2;

/**
 * The core LYPODDS visual: possession index over the previous + current round.
 * Home controls the top (+), Away the bottom (−). The right edge is the round close.
 */
export function PossessionChart({
  match,
  positions = [],
  compact = false,
  className,
}: {
  match: Match;
  positions?: Position[];
  compact?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const [ref, { width: W, height: H }] = useElementSize<HTMLDivElement>({ width: 800, height: compact ? 160 : 380 });
  const pad = compact ? { l: 6, r: 50, t: 10, b: 16 } : { l: 10, r: 74, t: 26, b: 26 };
  const iw = Math.max(10, W - pad.l - pad.r);
  const ih = Math.max(10, H - pad.t - pad.b);
  const we = match.round.end;
  const ws = we - WINDOW;
  const x = (t: number) => pad.l + ((t - ws) / WINDOW) * iw;
  const y = (v: number) => pad.t + ((100 - v) / 200) * ih;
  const y0 = y(0);

  const pts = match.series.filter((p) => p.t >= ws);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const last = pts[pts.length - 1] ?? { t: match.clock, v: match.index };
  const ref3 = pts[Math.max(0, pts.length - 4)] ?? last;
  const rising = last.v >= ref3.v;
  const area = pts.length > 1 ? `${line}L${x(last.t).toFixed(1)},${y0}L${x(pts[0].t).toFixed(1)},${y0}Z` : "";
  const tx = x(last.t);
  const ty = y(last.v);
  const homeLead = last.v >= 0;

  const ticks: number[] = [];
  const step = compact ? 120 : 60;
  for (let t = Math.ceil(Math.max(ws, 0) / step) * step; t <= we; t += step) ticks.push(t);

  const live = match.status === "live";
  const entries = positions.filter((p) => p.market === "possession" && p.status === "open" && p.matchId === match.id);

  return (
    <div ref={ref} className={cn("relative w-full overflow-hidden", compact ? "h-40" : "h-[320px] md:h-[400px]", className)}>
      <svg width={W} height={H} className="absolute inset-0 select-none" role="img" aria-label={`Possession index ${fmtIndex(match.index)}`}>
        <defs>
          <clipPath id={`top${uid}`}><rect x={0} y={0} width={W} height={y0} /></clipPath>
          <clipPath id={`bot${uid}`}><rect x={0} y={y0} width={W} height={H - y0} /></clipPath>
          <linearGradient id={`gb${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--bull)", stopOpacity: 0.42 }} />
            <stop offset="1" style={{ stopColor: "var(--bull)", stopOpacity: 0.02 }} />
          </linearGradient>
          <linearGradient id={`gr${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" style={{ stopColor: "var(--bear)", stopOpacity: 0.42 }} />
            <stop offset="1" style={{ stopColor: "var(--bear)", stopOpacity: 0.02 }} />
          </linearGradient>
          <pattern id={`hatch${uid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-primary/25" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Half backgrounds */}
        <rect x={pad.l} y={pad.t} width={iw} height={y0 - pad.t} className="fill-bull/[0.035]" />
        <rect x={pad.l} y={y0} width={iw} height={pad.t + ih - y0} className="fill-bear/[0.035]" />
        {/* Previous round dimmed */}
        <rect x={pad.l} y={pad.t} width={Math.max(0, x(match.round.start) - pad.l)} height={ih} className="fill-background/40" />
        {/* Lock zone */}
        {live && <rect x={x(we - LOCK_SECONDS)} y={pad.t} width={x(we) - x(we - LOCK_SECONDS)} height={ih} fill={`url(#hatch${uid})`} />}

        {/* Grid */}
        {[-100, -50, 50, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)} className="stroke-grid" strokeDasharray="2 4" />
            {!compact && (
              <text x={pad.l + iw + 8} y={y(v) + 3} className="fill-muted-foreground font-mono text-[10px]">
                {v > 0 ? `+${v}` : `−${Math.abs(v)}`}
              </text>
            )}
          </g>
        ))}
        <line x1={pad.l} x2={pad.l + iw} y1={y0} y2={y0} className="stroke-muted-foreground/50" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={pad.t} y2={pad.t + ih} className="stroke-grid/50" />
            <text x={x(t)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
              {t / 60}'
            </text>
          </g>
        ))}

        {/* Round markers */}
        <line x1={x(match.round.start)} x2={x(match.round.start)} y1={pad.t - (compact ? 0 : 10)} y2={pad.t + ih} className="stroke-primary/60" strokeDasharray="4 3" />
        {!compact && (
          <>
            <text x={x(match.round.start) + 6} y={pad.t - 10} className="fill-primary font-mono text-[10px] font-semibold tracking-wider">
              R{match.round.number} OPEN
            </text>
            {live && (
              <text x={x(we - LOCK_SECONDS)} y={pad.t - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px] tracking-wider">
                LOCK
              </text>
            )}
            <text x={x(we)} y={pad.t - 10} textAnchor="end" className="fill-foreground font-mono text-[10px] font-semibold tracking-wider">
              CLOSE
            </text>
          </>
        )}
        <line x1={x(we)} x2={x(we)} y1={pad.t} y2={pad.t + ih} className="stroke-foreground/40" />

        {/* Area + split-colour line */}
        {area && <path d={area} fill={`url(#gb${uid})`} clipPath={`url(#top${uid})`} />}
        {area && <path d={area} fill={`url(#gr${uid})`} clipPath={`url(#bot${uid})`} />}
        <path d={line} fill="none" className="stroke-bull" strokeWidth={compact ? 1.6 : 2.2} strokeLinejoin="round" clipPath={`url(#top${uid})`} />
        <path d={line} fill="none" className="stroke-bear" strokeWidth={compact ? 1.6 : 2.2} strokeLinejoin="round" clipPath={`url(#bot${uid})`} />

        {/* Open BUY/SELL entries */}
        {entries.map((p) => {
          const ey = y(p.entryIndex);
          const ex = Math.max(pad.l, x(p.placedClock));
          const buy = p.selection === "buy";
          return (
            <g key={p.id}>
              <line x1={ex} x2={pad.l + iw} y1={ey} y2={ey} className={buy ? "stroke-bull" : "stroke-bear"} strokeDasharray="5 4" strokeWidth="1.2" />
              <circle cx={ex} cy={ey} r="3" className={buy ? "fill-bull" : "fill-bear"} />
              {!compact && (
                <text x={ex + 6} y={ey + (buy ? -6 : 13)} className={cn("font-mono text-[10px] font-semibold", buy ? "fill-bull" : "fill-bear")}>
                  {buy ? "BUY" : "SELL"} {fmtPts(p.stake)} @ {fmtIndex(p.entryIndex)}
                </text>
              )}
            </g>
          );
        })}

        {/* Live tip */}
        {pts.length > 0 && (
          <g>
            <line x1={tx} x2={pad.l + iw} y1={ty} y2={ty} className={homeLead ? "stroke-bull/50" : "stroke-bear/50"} strokeDasharray="1 3" />
            {live && <circle cx={tx} cy={ty} r="4" className={cn("animate-tip", homeLead ? "fill-bull" : "fill-bear")} />}
            <circle cx={tx} cy={ty} r={compact ? 3 : 4.5} className={cn("stroke-background", homeLead ? "fill-bull" : "fill-bear")} strokeWidth="2" />
            {live && !compact && (
              <polygon
                points={rising ? `${tx},${ty - 22} ${tx - 7},${ty - 11} ${tx + 7},${ty - 11}` : `${tx},${ty + 22} ${tx - 7},${ty + 11} ${tx + 7},${ty + 11}`}
                className={rising ? "fill-bull" : "fill-bear"}
              />
            )}
            <g transform={`translate(${pad.l + iw + 4}, ${Math.min(Math.max(ty, pad.t + 8), pad.t + ih - 8)})`}>
              <rect x={0} y={-10} width={pad.r - 8} height={20} rx={4} className={homeLead ? "fill-bull" : "fill-bear"} />
              <text x={(pad.r - 8) / 2} y={4} textAnchor="middle" className={cn("font-mono text-[11px] font-bold", homeLead ? "fill-bull-foreground" : "fill-bear-foreground")}>
                {fmtIndex(last.v)}
              </text>
            </g>
          </g>
        )}
      </svg>

      {!compact && (
        <>
          <div className="pointer-events-none absolute left-4 top-9 flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-bull">
            ▲ HOME + <span className="text-foreground">{match.home.name}</span>
          </div>
          <div className="pointer-events-none absolute bottom-9 left-4 flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-bear">
            ▼ AWAY − <span className="text-foreground">{match.away.name}</span>
          </div>
        </>
      )}
      {match.status !== "live" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
          <span className="rounded-md border border-border bg-surface-raised px-3 py-1.5 font-mono text-xs font-semibold tracking-widest">
            {match.status === "finished" ? "FULL TIME — MARKET CLOSED" : "KICK-OFF SOON"}
          </span>
        </div>
      )}
    </div>
  );
}
