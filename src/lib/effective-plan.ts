import { type PlanId, isPlanId } from "@/config/plans";

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

export function effectivePlan(workspace: {
  plan: string;
  subscriptionStatus: string | null;
}): PlanId {
  const plan = isPlanId(workspace.plan) ? workspace.plan : "FREE";
  const status = workspace.subscriptionStatus;

  if (!status || ACTIVE_STATUSES.has(status)) {
    return plan;
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return "FREE";
  }

  return plan;
}

export function isPastDue(workspace: {
  subscriptionStatus: string | null;
}): boolean {
  const status = workspace.subscriptionStatus;
  return status === "past_due" || status === "unpaid";
}
