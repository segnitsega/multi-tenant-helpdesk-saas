export const PLANS = {
  FREE: {
    seats: 2,
    historyDays: 30,
    automations: 0,
    sla: false,
    widget: false,
    analyticsDays: 7,
  },
  PRO: {
    seats: 10,
    historyDays: 365,
    automations: 10,
    sla: true,
    widget: true,
    analyticsDays: 90,
  },
  BUSINESS: {
    seats: 50,
    historyDays: null,
    automations: null,
    sla: true,
    widget: true,
    analyticsDays: 365,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export const PAID_PLANS = ["PRO", "BUSINESS"] as const satisfies readonly PlanId[];

export type PaidPlanId = (typeof PAID_PLANS)[number];

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export function planLimits(plan: PlanId) {
  return PLANS[plan];
}
