import { useId } from "react";
import { cn } from "@/lib/utils";

/** Compact line for possession index (-100..100, zero-centred) or any series (auto range). */
export function Sparkline({
  values,
  centered = true,
  className,
  width = 160,
  height = 44,
}: {
  values: number[];
  centered?: boolean;
  className?: string;
  width?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (values.length < 2) return <svg className={className} viewBox={`0 0 ${width} ${height}`} />;
  const min = centered ? -100 : Math.min(...values);
  const max = centered ? 100 : Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * width;
  const y = (v: number) => height - ((v - min) / span) * height;
  const zero = centered ? y(0) : y(values[0]!);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${d}L${width},${zero}L0,${zero}Z`;
  const last = values[values.length - 1]!;
  const up = centered ? last >= 0 : last >= values[0]!;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={cn("w-full", className)}>
      <defs>
        <clipPath id={`t${id}`}><rect x="0" y="0" width={width} height={zero} /></clipPath>
        <clipPath id={`b${id}`}><rect x="0" y={zero} width={width} height={height - zero} /></clipPath>
      </defs>
      <line x1="0" x2={width} y1={zero} y2={zero} className="stroke-grid" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <path d={area} className="fill-bull/15" clipPath={`url(#t${id})`} />
      <path d={area} className="fill-bear/15" clipPath={`url(#b${id})`} />
      <path d={d} fill="none" className="stroke-bull" strokeWidth="1.6" clipPath={`url(#t${id})`} vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" className="stroke-bear" strokeWidth="1.6" clipPath={`url(#b${id})`} vectorEffect="non-scaling-stroke" />
      <circle cx={x(values.length - 1)} cy={y(last)} r="2.5" className={up ? "fill-bull" : "fill-bear"} />
    </svg>
  );
}
