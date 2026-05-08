export type SlaPolicyMinutes = {
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

export type SlaState = "ok" | "warning" | "breached";

export function computeSlaDueDates(
  createdAt: Date,
  policy: SlaPolicyMinutes | null | undefined,
): {
  slaFirstResponseDueAt: Date | null;
  slaResolutionDueAt: Date | null;
} {
  if (!policy) {
    return { slaFirstResponseDueAt: null, slaResolutionDueAt: null };
  }

  return {
    slaFirstResponseDueAt: new Date(
      createdAt.getTime() + policy.firstResponseMinutes * 60_000,
    ),
    slaResolutionDueAt: new Date(
      createdAt.getTime() + policy.resolutionMinutes * 60_000,
    ),
  };
}

export function remainingMs(
  dueAt: Date | null | undefined,
  now = new Date(),
): number | null {
  if (!dueAt) return null;
  return dueAt.getTime() - now.getTime();
}

export function slaState(
  dueAt: Date | null | undefined,
  now: Date,
  totalMs: number,
): SlaState {
  if (!dueAt) return "ok";
  if (now.getTime() >= dueAt.getTime()) return "breached";
  if (totalMs <= 0) return "ok";

  const remaining = dueAt.getTime() - now.getTime();
  const ratio = remaining / totalMs;
  return ratio > 0.5 ? "ok" : "warning";
}
