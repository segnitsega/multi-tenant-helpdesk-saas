"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlanUsageMeter } from "@/components/plan-usage-meter";
import { PastDueBanner } from "@/components/past-due-banner";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { PLANS, type PaidPlanId, type PlanId } from "@/config/plans";
import {
  createCheckoutSessionAction,
  createPortalSessionAction,
} from "@/features/billing/actions";

export type BillingSettingsProps = {
  slug: string;
  canManage: boolean;
  plan: PlanId;
  subscriptionStatus: string | null;
  pastDue: boolean;
  limits: (typeof PLANS)[PlanId];
  usage: { seatsUsed: number; automationsUsed: number };
  hasStripeCustomer: boolean;
};

const PLAN_COPY: Record<
  PlanId,
  { name: string; blurb: string; price: string }
> = {
  FREE: {
    name: "Free",
    blurb: "Solo inboxes getting started.",
    price: "$0",
  },
  PRO: {
    name: "Pro",
    blurb: "Growing teams with SLA and automations.",
    price: "$29",
  },
  BUSINESS: {
    name: "Business",
    blurb: "Larger desks with room to scale.",
    price: "$79",
  },
};

export function BillingSettings(props: BillingSettingsProps) {
  const {
    slug,
    canManage,
    plan,
    subscriptionStatus,
    pastDue,
    limits,
    usage,
    hasStripeCustomer,
  } = props;
  const [pending, startTransition] = useTransition();
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  function upgrade(next: PaidPlanId) {
    if (!canManage) return;
    setLimitMessage(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction(slug, { plan: next });
      if (!result.ok) {
        if (result.error.code === "PLAN_LIMIT") {
          setLimitMessage(result.error.message);
          return;
        }
        toast.error(result.error.message);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function openPortal() {
    if (!canManage) return;
    startTransition(async () => {
      const result = await createPortalSessionAction(slug, {});
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="space-y-10">
      {pastDue ? <PastDueBanner slug={slug} /> : null}

      {limitMessage ? (
        <UpgradePrompt slug={slug} description={limitMessage} />
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Current plan</h2>
            <p className="text-muted-foreground text-sm">
              {PLAN_COPY[plan].name}
              {subscriptionStatus ? ` · ${subscriptionStatus.replaceAll("_", " ")}` : null}
            </p>
          </div>
          {canManage && hasStripeCustomer ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={openPortal}
            >
              Manage billing
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlanUsageMeter
            label="Seats"
            used={usage.seatsUsed}
            limit={limits.seats}
          />
          <PlanUsageMeter
            label="Automations"
            used={usage.automationsUsed}
            limit={limits.automations}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Compare plans</h2>
          <p className="text-muted-foreground text-sm">
            Limits apply immediately after Stripe confirms the subscription.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const row = PLANS[id];
            const copy = PLAN_COPY[id];
            const current = id === plan;
            return (
              <div
                key={id}
                className="border-border flex flex-col gap-4 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{copy.name}</h3>
                    <p className="text-sm tabular-nums">
                      {copy.price}
                      <span className="text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">{copy.blurb}</p>
                </div>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>{row.seats} seats</li>
                  <li>
                    {row.automations == null
                      ? "Unlimited automations"
                      : `${row.automations} automations`}
                  </li>
                  <li>
                    {row.sla ? "SLA policies" : "No SLA"}
                    {" · "}
                    {row.widget ? "Widget" : "No widget"}
                  </li>
                  <li>
                    Analytics{" "}
                    {row.analyticsDays == null
                      ? "unlimited"
                      : `${row.analyticsDays}d`}
                  </li>
                </ul>
                {id === "FREE" ? (
                  <Button variant="outline" disabled>
                    {current ? "Current plan" : "Included"}
                  </Button>
                ) : (
                  <Button
                    disabled={pending || !canManage || current}
                    onClick={() => upgrade(id as PaidPlanId)}
                  >
                    {!canManage
                      ? "Owner only"
                      : current
                        ? "Current plan"
                        : `Upgrade to ${copy.name}`}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
