import "server-only";
import type Stripe from "stripe";
import { systemDb } from "@/server/db/system";
import { type PlanId, isPlanId } from "@/config/plans";
import { planFromPriceId } from "@/server/billing/stripe";

async function updateWorkspace(
  workspaceId: string,
  patch: {
    plan?: PlanId;
    subscriptionStatus?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  },
) {
  const existing = await systemDb.orm.public.Workspace.where({
    id: workspaceId,
  }).first();
  if (!existing) return null;
  return systemDb.orm.public.Workspace.where({ id: workspaceId }).update(patch);
}

async function findWorkspaceByCustomer(customerId: string) {
  return systemDb.orm.public.Workspace.where({
    stripeCustomerId: customerId,
  }).first();
}

async function findWorkspaceBySubscription(subscriptionId: string) {
  return systemDb.orm.public.Workspace.where({
    stripeSubscriptionId: subscriptionId,
  }).first();
}

function customerIdOf(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function priceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

function planFromSubscription(subscription: Stripe.Subscription): PlanId | null {
  const fromMeta = subscription.metadata?.plan;
  if (fromMeta && isPlanId(fromMeta) && fromMeta !== "FREE") {
    return fromMeta;
  }
  return planFromPriceId(priceIdFromSubscription(subscription));
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
) {
  const workspaceId =
    session.client_reference_id ?? session.metadata?.workspaceId ?? null;
  if (!workspaceId) return;

  const customerId = customerIdOf(session.customer);
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const planMeta = session.metadata?.plan;
  const plan =
    planMeta && isPlanId(planMeta) && planMeta !== "FREE" ? planMeta : null;

  await updateWorkspace(workspaceId, {
    ...(customerId ? { stripeCustomerId: customerId } : {}),
    ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    ...(plan ? { plan } : {}),
    subscriptionStatus: "active",
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
) {
  const customerId = customerIdOf(subscription.customer);
  const workspace =
    (await findWorkspaceBySubscription(subscription.id)) ??
    (subscription.metadata?.workspaceId
      ? await systemDb.orm.public.Workspace.where({
          id: subscription.metadata.workspaceId,
        }).first()
      : null) ??
    (customerId ? await findWorkspaceByCustomer(customerId) : null);

  if (!workspace) return;

  const status = subscription.status;
  const plan = planFromSubscription(subscription);

  if (status === "canceled" || status === "incomplete_expired") {
    await updateWorkspace(workspace.id, {
      plan: "FREE",
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  await updateWorkspace(workspace.id, {
    ...(plan ? { plan } : {}),
    subscriptionStatus: status,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerIdOf(subscription.customer) ?? workspace.stripeCustomerId,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
) {
  const workspace =
    (await findWorkspaceBySubscription(subscription.id)) ??
    (subscription.metadata?.workspaceId
      ? await systemDb.orm.public.Workspace.where({
          id: subscription.metadata.workspaceId,
        }).first()
      : null);

  if (!workspace) return;

  await updateWorkspace(workspace.id, {
    plan: "FREE",
    subscriptionStatus: "canceled",
    stripeSubscriptionId: null,
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = customerIdOf(invoice.customer);
  if (!customerId) return;
  const workspace = await findWorkspaceByCustomer(customerId);
  if (!workspace) return;

  await updateWorkspace(workspace.id, {
    subscriptionStatus: "past_due",
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = customerIdOf(invoice.customer);
  if (!customerId) return;
  const workspace = await findWorkspaceByCustomer(customerId);
  if (!workspace) return;

  if (workspace.subscriptionStatus === "past_due" || workspace.subscriptionStatus === "unpaid") {
    await updateWorkspace(workspace.id, {
      subscriptionStatus: "active",
    });
  }
}

export async function dispatchStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

export async function processStripeEvent(event: Stripe.Event) {
  const existing = await systemDb.orm.public.StripeEvent.where({
    id: event.id,
  }).first();
  if (existing) {
    return { duplicate: true as const };
  }

  await systemDb.orm.public.StripeEvent.create({
    id: event.id,
    type: event.type,
    processedAt: null,
  });

  try {
    await dispatchStripeEvent(event);
    await systemDb.orm.public.StripeEvent.where({ id: event.id }).update({
      processedAt: new Date(),
    });
  } catch (error) {
    await systemDb.orm.public.StripeEvent.where({ id: event.id }).delete();
    throw error;
  }

  return { duplicate: false as const };
}
