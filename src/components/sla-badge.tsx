"use client";

import { useEffect, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { remainingMs, slaState } from "@/lib/sla";
import { cn } from "@/lib/utils";

type SlaTone = "ok" | "warning" | "breached";

function formatSlaLabel(dueAt: Date, now: Date, tone: SlaTone): string {
  const distance = formatDistanceStrict(dueAt, now, {
    roundingMethod: "floor",
  });

  if (tone === "breached") {
    return `Breached ${distance} ago`;
  }

  return `${distance} left`;
}

const TONE_CLASS: Record<SlaTone, string> = {
  ok: "bg-success/10 text-success border-transparent",
  warning: "bg-warning/10 text-warning border-transparent",
  breached: "bg-destructive/10 text-destructive border-transparent",
};

export function SlaBadge({
  startsAt,
  dueAt,
  className,
}: {
  startsAt: Date | string;
  dueAt: Date | string;
  className?: string;
}) {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => {
      const remaining = remainingMs(due, new Date());
      const intervalMs =
        remaining != null && remaining > 0 && remaining < 120_000
          ? 1_000
          : 60_000;
      setNow(new Date());
      return intervalMs;
    };

    let timer: number;
    const schedule = () => {
      const intervalMs = tick();
      timer = window.setTimeout(schedule, intervalMs);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [due]);

  const totalMs = due.getTime() - start.getTime();
  const tone = slaState(due, now, totalMs);
  const label = formatSlaLabel(due, now, tone);

  return (
    <Badge
      variant="outline"
      className={cn("font-mono tabular-nums", TONE_CLASS[tone], className)}
      data-icon="inline-start"
      title={`Due ${due.toLocaleString()}`}
    >
      <TimerIcon aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}
