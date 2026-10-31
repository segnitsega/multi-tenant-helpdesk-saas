import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import { processStripeEvent } from "@/server/billing/webhook-handlers";
import { assertWithinPlan, effectivePlan } from "@/server/services/billing.service";
import { PlanLimitError } from "@/lib/api-error";

function loadFixture(
  name: string,
  workspaceId: string,
  eventIdSuffix: string,
): Stripe.Event {
  const raw = readFileSync(
    path.resolve("tests/fixtures/stripe", name),
    "utf8",
  )
    .replaceAll("__WORKSPACE_ID__", workspaceId)
    .replaceAll("evt_test_", `evt_test_${eventIdSuffix}_`);
  return JSON.parse(raw) as Stripe.Event;
}

describe("stripe webhook handlers", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  const customerId = `cus_test_${suffix}`;
  const subscriptionId = `sub_test_${suffix}`;

  beforeAll(async () => {
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Billing ${suffix}`,
      slug: `billing-${suffix}`,
      inboundAddress: `billing-${suffix}@mail.localhost`,
      widgetKey: `wk_billing_${suffix}`,
      plan: "FREE",
    });
    workspaceId = workspace.id;
    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 0,
    });
  }, 60_000);

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
      const events = await systemDb.orm.public.StripeEvent.where({}).all();
      for (const event of events) {
        if (event.id.includes(suffix)) {
          await systemDb.orm.public.StripeEvent.where({ id: event.id }).delete();
        }
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  }, 60_000);

  it("upgrades on checkout, ignores duplicates, handles out-of-order payment events", async () => {
    const checkout = loadFixture(
      "checkout.session.completed.json",
      workspaceId,
      suffix,
    );
    (checkout.data.object as Stripe.Checkout.Session).customer = customerId;
    (checkout.data.object as Stripe.Checkout.Session).subscription =
      subscriptionId;

    const first = await processStripeEvent(checkout);
    expect(first).toEqual({ duplicate: false });

    let workspace = await systemDb.orm.public.Workspace.where({
      id: workspaceId,
    }).first();
    expect(workspace?.plan).toBe("PRO");
    expect(workspace?.stripeCustomerId).toBe(customerId);
    expect(workspace?.stripeSubscriptionId).toBe(subscriptionId);
    expect(workspace?.subscriptionStatus).toBe("active");

    const dup = await processStripeEvent(checkout);
    expect(dup).toEqual({ duplicate: true });
    workspace = await systemDb.orm.public.Workspace.where({
      id: workspaceId,
    }).first();
    expect(workspace?.plan).toBe("PRO");

    const failed = loadFixture(
      "invoice.payment_failed.json",
      workspaceId,
      suffix,
    );
    (failed.data.object as { customer: string }).customer = customerId;
    await processStripeEvent(failed);

    const pastDue = loadFixture(
      "customer.subscription.updated.past_due.json",
      workspaceId,
      suffix,
    );
    (pastDue.data.object as Stripe.Subscription).id = subscriptionId;
    (pastDue.data.object as Stripe.Subscription).customer = customerId;
    await processStripeEvent(pastDue);

    workspace = await systemDb.orm.public.Workspace.where({
      id: workspaceId,
    }).first();
    expect(workspace?.subscriptionStatus).toBe("past_due");
    expect(effectivePlan(workspace!)).toBe("PRO");

    const paid = loadFixture("invoice.paid.json", workspaceId, suffix);
    (paid.data.object as { customer: string }).customer = customerId;
    await processStripeEvent(paid);

    const active = loadFixture(
      "customer.subscription.updated.active.json",
      workspaceId,
      suffix,
    );
    (active.data.object as Stripe.Subscription).id = subscriptionId;
    (active.data.object as Stripe.Subscription).customer = customerId;
    await processStripeEvent(active);

    workspace = await systemDb.orm.public.Workspace.where({
      id: workspaceId,
    }).first();
    expect(workspace?.subscriptionStatus).toBe("active");
    expect(workspace?.plan).toBe("PRO");

    const deleted = loadFixture(
      "customer.subscription.deleted.json",
      workspaceId,
      suffix,
    );
    (deleted.data.object as Stripe.Subscription).id = subscriptionId;
    (deleted.data.object as Stripe.Subscription).customer = customerId;
    await processStripeEvent(deleted);

    workspace = await systemDb.orm.public.Workspace.where({
      id: workspaceId,
    }).first();
    expect(workspace?.plan).toBe("FREE");
    expect(workspace?.subscriptionStatus).toBe("canceled");
    expect(effectivePlan(workspace!)).toBe("FREE");
  }, 90_000);

  it("blocks a third Free seat with PlanLimitError", async () => {
    await systemDb.orm.public.Workspace.where({ id: workspaceId }).update({
      plan: "FREE",
      subscriptionStatus: null,
    });

    const users = [];
    for (let i = 0; i < 2; i += 1) {
      const user = await systemDb.orm.public.User.create({
        email: `seat-${suffix}-${i}@example.com`,
        name: `Seat ${i}`,
        passwordHash: "x",
      });
      users.push(user);
      await systemDb.orm.public.Membership.create({
        workspaceId,
        userId: user.id,
        role: i === 0 ? "OWNER" : "AGENT",
      });
    }

    await expect(
      assertWithinPlan({ workspaceId }, "invite_member"),
    ).rejects.toBeInstanceOf(PlanLimitError);

    for (const user of users) {
      await systemDb.orm.public.User.where({ id: user.id }).delete();
    }
  }, 60_000);
});
