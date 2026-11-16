import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "bull" | "bear" | "brand";
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
      </div>
      <div
        className={cn(
          "num mt-2 text-2xl font-semibold",
          tone === "bull" && "text-bull",
          tone === "bear" && "text-bear",
          tone === "brand" && "text-primary",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
