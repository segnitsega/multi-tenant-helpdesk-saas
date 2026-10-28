import "server-only";
import { systemDb } from "@/server/db/system";
import { withTenantDb } from "@/server/db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  PlanLimitError,
} from "@/lib/api-error";
import {
  type PaidPlanId,
  type PlanId,
  isPlanId,
  planLimits,
} from "@/config/plans";
import { effectivePlan, isPastDue } from "@/lib/effective-plan";
import { env } from "@/server/env";
import { getStripe, priceIdForPlan } from "@/server/billing/stripe";
import type { TenantContext } from "@/types/tenant";

export { effectivePlan, isPastDue };

export type PlanCheck =
  | "invite_member"
  | "create_automation"
  | "enable_widget"
  | "analytics_range"
  | "enable_sla";

async function loadWorkspace(workspaceId: string) {
  const workspace = await systemDb.orm.public.Workspace.where({
    id: workspaceId,
  }).first();
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

export async function getBillingUsage(workspaceId: string) {
  const memberships = await systemDb.orm.public.Membership.where({
    workspaceId,
  }).all();
  const pendingInvites = (
    await systemDb.orm.public.Invitation.where({ workspaceId }).all()
  ).filter((row) => !row.acceptedAt && row.expiresAt.getTime() > Date.now());

  const automations = await withTenantDb({ workspaceId }, async (tx) =>
    tx.orm.public.AutomationRule.where({ workspaceId }).all(),
  );

  return {
    seatsUsed: memberships.length + pendingInvites.length,
    automationsUsed: automations.length,
  };
}

export async function getBillingSnapshot(workspaceId: string) {
  const workspace = await loadWorkspace(workspaceId);
  const plan = effectivePlan(workspace);
  const limits = planLimits(plan);
  const usage = await getBillingUsage(workspaceId);

  return {
    workspaceId: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    plan,
    storedPlan: isPlanId(workspace.plan) ? workspace.plan : "FREE",
    subscriptionStatus: workspace.subscriptionStatus,
    pastDue: isPastDue(workspace),
    stripeCustomerId: workspace.stripeCustomerId,
    stripeSubscriptionId: workspace.stripeSubscriptionId,
    limits,
    usage,
  };
}

export async function assertWithinPlan(
  ctx: Pick<TenantContext, "workspaceId">,
  check: PlanCheck,
  opts?: { days?: number },
) {
  const workspace = await loadWorkspace(ctx.workspaceId);
  const plan = effectivePlan(workspace);
  const limits = planLimits(plan);

  if (check === "invite_member") {
    const { seatsUsed } = await getBillingUsage(ctx.workspaceId);
    if (seatsUsed >= limits.seats) {
      throw new PlanLimitError(
        `Your ${plan} plan allows ${limits.seats} seats. Upgrade to invite more teammates.`,
        { limit: "seats", plan },
      );
    }
    return;
  }

  if (check === "create_automation") {
    if (limits.automations === 0) {
      throw new PlanLimitError(
        "Automations are not available on the Free plan. Upgrade to Pro to add rules.",
        { limit: "automations", plan },
      );
    }
    if (limits.automations != null) {
      const { automationsUsed } = await getBillingUsage(ctx.workspaceId);
      if (automationsUsed >= limits.automations) {
        throw new PlanLimitError(
          `Your ${plan} plan allows ${limits.automations} automation rules. Upgrade for more.`,
          { limit: "automations", plan },
        );
      }
    }
    return;
  }

  if (check === "enable_widget") {
    if (!limits.widget) {
      throw new PlanLimitError(
        "The embeddable widget requires Pro or Business.",
        { limit: "widget", plan },
      );
    }
    return;
  }

  if (check === "enable_sla") {
    if (!limits.sla) {
      throw new PlanLimitError("SLA policies require Pro or Business.", {
        limit: "sla",
        plan,
      });
    }
    return;
  }

  if (check === "analytics_range") {
    const days = opts?.days ?? 0;
    if (limits.analyticsDays != null && days > limits.analyticsDays) {
      throw new PlanLimitError(
        `Your ${plan} plan allows analytics up to ${limits.analyticsDays} days. Upgrade for a longer range.`,
        { limit: "analyticsDays", plan },
      );
    }
  }
}

export async function createCheckoutSession(
  ctx: TenantContext,
  plan: PaidPlanId,
) {
  if (ctx.role !== "OWNER") {
    throw new ForbiddenError("Only owners can manage billing");
  }

  const workspace = await loadWorkspace(ctx.workspaceId);
  const stripe = getStripe();
  const priceId = priceIdForPlan(plan);

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const owner = await systemDb.orm.public.User.where({
      id: ctx.userId,
    }).first();
    const customer = await stripe.customers.create({
      email: owner?.email,
      name: workspace.name,
      metadata: {
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
      },
    });
    customerId = customer.id;
    await systemDb.orm.public.Workspace.where({ id: workspace.id }).update({
      stripeCustomerId: customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: workspace.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/w/${workspace.slug}/settings/billing?checkout=success`,
    cancel_url: `${env.APP_URL}/w/${workspace.slug}/settings/billing?checkout=canceled`,
    metadata: {
      workspaceId: workspace.id,
      plan,
    },
    subscription_data: {
      metadata: {
        workspaceId: workspace.id,
        plan,
      },
    },
  });

  if (!session.url) {
    throw new BadRequestError("Stripe did not return a checkout URL");
  }

  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession(ctx: TenantContext) {
  if (ctx.role !== "OWNER") {
    throw new ForbiddenError("Only owners can manage billing");
  }

  const workspace = await loadWorkspace(ctx.workspaceId);
  if (!workspace.stripeCustomerId) {
    throw new BadRequestError("No Stripe customer for this workspace yet");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${env.APP_URL}/w/${workspace.slug}/settings/billing`,
  });

  return { url: session.url };
}
