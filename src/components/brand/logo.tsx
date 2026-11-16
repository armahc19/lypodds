import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-surface-raised stroke-border" />
      <line x1="5" y1="16" x2="27" y2="16" className="stroke-grid" strokeWidth="1" strokeDasharray="2 2" />
      <polyline
        points="5,19 10,13 14,17 18,8 22,20 27,11"
        fill="none"
        className="stroke-primary"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="27" cy="11" r="2.4" className="fill-bull" />
    </svg>
  );
}

export function Logo({ withTagline = true }: { withTagline?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-lg font-bold tracking-tight">
          LYP<span className="text-brand-gradient">ODDS</span>
        </div>
        {withTagline && <div className="label-caps mt-1 text-[0.56rem]">Trade the game.</div>}
      </div>
    </div>
  );
}
