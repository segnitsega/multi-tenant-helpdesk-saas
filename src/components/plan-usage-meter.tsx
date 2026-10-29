import { cn } from "@/lib/utils";

export function PlanUsageMeter({
  label,
  used,
  limit,
  className,
}: {
  label: string;
  used: number;
  limit: number | null;
  className?: string;
}) {
  const unlimited = limit == null;
  const ratio = unlimited ? 0 : limit === 0 ? 1 : Math.min(1, used / limit);
  const atLimit = !unlimited && used >= limit;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used}
          {unlimited ? " / ∞" : ` / ${limit}`}
        </span>
      </div>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={unlimited ? undefined : limit}
        aria-valuenow={used}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            atLimit ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${unlimited ? 8 : Math.max(ratio * 100, used > 0 ? 6 : 0)}%` }}
        />
      </div>
    </div>
  );
}
