import { cn } from "@/lib/utils";

/** Catalog statistic tile. Numbers come from OmniSource /stats. */
export function StatsCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center gap-1 p-5 text-center", className)}>
      <span className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
        {value}
      </span>
      <span className="text-sm font-medium text-fg">{label}</span>
      {hint ? <span className="text-xs text-subtle">{hint}</span> : null}
    </div>
  );
}
