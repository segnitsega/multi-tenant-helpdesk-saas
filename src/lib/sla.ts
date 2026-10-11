export type SlaPolicyMinutes = {
  firstResponseMinutes: number;
  resolutionMinutes: number;
};

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

export function remainingMs(dueAt: Date | null | undefined, now = new Date()): number | null {
  if (!dueAt) return null;
  return dueAt.getTime() - now.getTime();
}
