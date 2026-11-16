import { cn } from "@/lib/utils";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  );
}

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-live/15 px-1.5 py-0.5 font-mono text-[0.62rem] font-semibold tracking-widest text-live">
      <LiveDot className="size-1.5" />
      {label}
    </span>
  );
}
