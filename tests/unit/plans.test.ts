import { describe, expect, it } from "vitest";
import { PLANS, planLimits } from "@/config/plans";
import { PlanLimitError, toApiError } from "@/lib/api-error";
import { effectivePlan, isPastDue } from "@/lib/effective-plan";

describe("plans config", () => {
  it("exposes Free / Pro / Business limits", () => {
    expect(PLANS.FREE.seats).toBe(2);
    expect(PLANS.FREE.automations).toBe(0);
    expect(PLANS.PRO.sla).toBe(true);
    expect(PLANS.BUSINESS.automations).toBeNull();
    expect(planLimits("PRO").analyticsDays).toBe(90);
  });
});

describe("effectivePlan", () => {
  it("keeps the stored plan while past_due (grace)", () => {
    expect(
      effectivePlan({ plan: "PRO", subscriptionStatus: "past_due" }),
    ).toBe("PRO");
    expect(isPastDue({ subscriptionStatus: "past_due" })).toBe(true);
  });

  it("treats canceled subscriptions as Free for limits", () => {
    expect(
      effectivePlan({ plan: "BUSINESS", subscriptionStatus: "canceled" }),
    ).toBe("FREE");
  });

  it("uses the stored plan when active or unset", () => {
    expect(effectivePlan({ plan: "PRO", subscriptionStatus: "active" })).toBe(
      "PRO",
    );
    expect(effectivePlan({ plan: "FREE", subscriptionStatus: null })).toBe(
      "FREE",
    );
  });
});

describe("PlanLimitError", () => {
  it("serializes through toApiError", () => {
    const error = new PlanLimitError("Seat limit reached", {
      limit: "seats",
      plan: "FREE",
    });
    expect(toApiError(error)).toEqual({
      code: "PLAN_LIMIT",
      message: "Seat limit reached",
      limit: "seats",
      plan: "FREE",
    });
  });
});
