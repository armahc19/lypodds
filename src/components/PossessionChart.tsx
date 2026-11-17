import { useId } from "react";
type Props = { history: number[]; height?: number; home: string; away: string };

export function PossessionChart({ history, height = 280, home, away }: Props) {
  const id = useId().replaceAll(":", "");
  const data = history.length ? history.slice(-120) : [0];
  const w = 1000;
  const h = height;
  const mid = h / 2;
  const x = (i: number) => (data.length === 1 ? w : (i / (data.length - 1)) * w);
  const y = (v: number) => mid - (v / 100) * (mid - 12);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${w},${mid} L0,${mid} Z`;
  const last = data[data.length - 1] ?? 0;

  return (
    <div className="relative border-y border-border terminal-grid">
      <div className="pointer-events-none absolute left-3 top-2 font-mono text-xs text-up">+ {home}</div>
      <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-xs text-down">− {away}</div>
      <div className={`pointer-events-none absolute right-3 top-2 font-mono text-sm font-semibold ${last >= 0 ? "text-up" : "text-down"}`}>
        {last >= 0 ? "+" : ""}{last.toFixed(1)}
      </div>
      <svg role="img" aria-label={`Possession control: ${home} above zero, ${away} below zero`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block w-full" style={{ height }}>
        <defs>
          <clipPath id={`${id}-above`}><rect x="0" y="0" width={w} height={mid} /></clipPath>
          <clipPath id={`${id}-below`}><rect x="0" y={mid} width={w} height={mid} /></clipPath>
        </defs>
        <line x1="0" x2={w} y1={mid} y2={mid} className="stroke-muted-foreground" strokeDasharray="4 6" strokeWidth="1" />
        <path d={area} clipPath={`url(#${id}-above)`} className="fill-up/15" />
        <path d={area} clipPath={`url(#${id}-below)`} className="fill-down/15" />
        <path d={line} clipPath={`url(#${id}-above)`} className="fill-none stroke-up" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={line} clipPath={`url(#${id}-below)`} className="fill-none stroke-down" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(data.length - 1)} cy={y(last)} r="5" className={last >= 0 ? "fill-up" : "fill-down"} />
      </svg>
    </div>
  );
}

