export type AnalyticsPreset = "7d" | "30d" | "90d" | "custom";

export type ParsedAnalyticsRange = {
  preset: AnalyticsPreset;
  from: Date;
  to: Date;
  days: number;
  agentId: string | null;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function daysBetween(from: Date, to: Date): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function parseAnalyticsRange(input: {
  range?: string | null;
  from?: string | null;
  to?: string | null;
  agent?: string | null;
  now?: Date;
}): ParsedAnalyticsRange {
  const now = input.now ?? new Date();
  const end = startOfUtcDay(now);
  const toExclusive = addUtcDays(end, 1);
  const agentId = input.agent?.trim() || null;

  const presetRaw = (input.range ?? "30d").toLowerCase();
  if (presetRaw === "custom" || input.from || input.to) {
    const from = input.from
      ? startOfUtcDay(new Date(input.from))
      : addUtcDays(end, -29);
    const toDay = input.to ? startOfUtcDay(new Date(input.to)) : end;
    const safeFrom = Number.isNaN(from.getTime()) ? addUtcDays(end, -29) : from;
    const safeToDay = Number.isNaN(toDay.getTime()) ? end : toDay;
    const orderedFrom =
      safeFrom.getTime() <= safeToDay.getTime() ? safeFrom : safeToDay;
    const orderedToDay =
      safeFrom.getTime() <= safeToDay.getTime() ? safeToDay : safeFrom;
    const to = addUtcDays(orderedToDay, 1);
    return {
      preset: "custom",
      from: orderedFrom,
      to,
      days: daysBetween(orderedFrom, orderedToDay),
      agentId,
    };
  }

  const preset: AnalyticsPreset =
    presetRaw === "7d" || presetRaw === "90d" ? presetRaw : "30d";
  const span = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = addUtcDays(end, -(span - 1));
  return {
    preset,
    from,
    to: toExclusive,
    days: span,
    agentId,
  };
}

export function previousPeriod(range: Pick<ParsedAnalyticsRange, "from" | "to" | "days">) {
  const to = range.from;
  const from = addUtcDays(to, -range.days);
  return { from, to, days: range.days };
}

export function formatDurationSeconds(seconds: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
