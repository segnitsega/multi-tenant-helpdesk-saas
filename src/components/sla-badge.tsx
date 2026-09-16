"use client";

import { useEffect, useState } from "react";
import { formatDistanceStrict } from "date-fns";
import { TimerIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SlaTone = "ok" | "warn" | "breached";

function getTone(startsAt: Date, dueAt: Date, now: Date): SlaTone {
  if (now >= dueAt) return "breached";

  const totalMs = dueAt.getTime() - startsAt.getTime();
  if (totalMs <= 0) return now >= dueAt ? "breached" : "ok";

  const remainingMs = dueAt.getTime() - now.getTime();
  const remainingRatio = remainingMs / totalMs;

  return remainingRatio > 0.5 ? "ok" : "warn";
}

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
  warn: "bg-warning/10 text-warning border-transparent",
  breached: "bg-destructive/10 text-destructive border-transparent",
};

export function SlaBadge({
  startsAt,
  dueAt,
  className,
}: {
  /** When the SLA clock started (e.g. ticket created / first response window). */
  startsAt: Date | string;
  dueAt: Date | string;
  className?: string;
}) {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const tone = getTone(start, due, now);
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
