import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  change,
  invertChange = false,
  className,
}: {
  label: string;
  value: string;
  change: number | null;
  invertChange?: boolean;
  className?: string;
}) {
  const improved =
    change == null
      ? null
      : invertChange
        ? change <= 0
        : change >= 0;

  return (
    <div
      className={cn(
        "border-border bg-card flex flex-col gap-2 rounded-lg border px-4 py-3",
        className,
      )}
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p
        className={cn(
          "text-xs tabular-nums",
          change == null
            ? "text-muted-foreground"
            : improved
              ? "text-success"
              : "text-destructive",
        )}
      >
        {change == null
          ? "vs prior period"
          : `${change > 0 ? "+" : ""}${change.toFixed(0)}% vs prior`}
      </p>
    </div>
  );
}
