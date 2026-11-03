import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import {
  getAnalyticsDashboard,
  getAnalyticsKpis,
} from "@/server/services/analytics.service";
import { parseAnalyticsRange } from "@/lib/analytics-range";
import type { TenantContext } from "@/types/tenant";

describe("analytics queries", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let membershipId: string;
  let ctx: TenantContext;

  beforeAll(async () => {
    const user = await systemDb.orm.public.User.create({
      email: `analytics-${suffix}@example.com`,
      name: "Analytics Owner",
      passwordHash: "x",
    });
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Analytics ${suffix}`,
      slug: `analytics-${suffix}`,
      inboundAddress: `analytics-${suffix}@mail.localhost`,
      widgetKey: `wk_analytics_${suffix}`,
      plan: "PRO",
      subscriptionStatus: "active",
      timezone: "UTC",
    });
    workspaceId = workspace.id;
    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 5,
    });
    const membership = await systemDb.orm.public.Membership.create({
      workspaceId,
      userId: user.id,
      role: "OWNER",
    });
    membershipId = membership.id;
    ctx = {
      userId: user.id,
      workspaceId,
      membershipId,
      role: "OWNER",
      readonly: false,
      slug: workspace.slug,
    };

    const customer = await systemDb.orm.public.Customer.create({
      workspaceId,
      email: `c-${suffix}@example.com`,
      name: "Analytics Customer",
    });

    // Hand-computed fixture in a fixed window:
    // created: 5 tickets on 2026-11-10..11
    // FRT seconds: 60, 120, 180, 240 → median of responded = 150
    // resolution seconds: 600, 1200 → median = 900
    // SLA: 4 with due dates, 1 breached → compliance 75%
    const base = new Date("2026-11-10T10:00:00.000Z");
    const specs = [
      { offsetH: 0, frtMin: 1, resMin: 10, breached: false },
      { offsetH: 1, frtMin: 2, resMin: 20, breached: false },
      { offsetH: 2, frtMin: 3, resMin: null, breached: false },
      { offsetH: 25, frtMin: 4, resMin: null, breached: true },
      { offsetH: 26, frtMin: null, resMin: null, breached: false },
    ] as const;

    for (const [index, spec] of specs.entries()) {
      const createdAt = new Date(base.getTime() + spec.offsetH * 3_600_000);
      const firstResponseAt =
        spec.frtMin == null
          ? null
          : new Date(createdAt.getTime() + spec.frtMin * 60_000);
      const resolvedAt =
        spec.resMin == null
          ? null
          : new Date(createdAt.getTime() + spec.resMin * 60_000);
      const ticket = await systemDb.orm.public.Ticket.create({
        workspaceId,
        number: index + 1,
        customerId: customer.id,
        subject: `Analytics fixture ${index + 1}`,
        channel: index % 2 === 0 ? "EMAIL" : "MANUAL",
        status: resolvedAt ? "RESOLVED" : "OPEN",
        priority: "NORMAL",
        assigneeMembershipId: membershipId,
        lastMessageAt: createdAt,
      });
      await systemDb.orm.public.Ticket.where({ id: ticket.id }).update({
        createdAt,
        lastMessageAt: firstResponseAt ?? createdAt,
        firstResponseAt,
        resolvedAt,
        slaFirstResponseDueAt:
          index === 4
            ? null
            : new Date(createdAt.getTime() + 2 * 60 * 60_000),
        slaResolutionDueAt:
          index === 4
            ? null
            : new Date(createdAt.getTime() + 24 * 60 * 60_000),
        slaFirstResponseBreached: spec.breached,
        slaResolutionBreached: false,
      });
    }
  }, 90_000);

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  }, 60_000);

  it("matches hand-computed medians and counts", async () => {
    const range = parseAnalyticsRange({
      range: "custom",
      from: "2026-11-10",
      to: "2026-11-11",
      now: new Date("2026-11-16T00:00:00.000Z"),
    });
    const previous = {
      from: new Date("2026-11-08T00:00:00.000Z"),
      to: new Date("2026-11-10T00:00:00.000Z"),
    };

    const kpis = await getAnalyticsKpis(ctx, range, previous);
    expect(kpis.ticketsCreated.value).toBe(5);
    // FRT minutes 1,2,3,4 → 60,120,180,240s → median 150
    expect(kpis.medianFirstResponseSeconds.value).toBe(150);
    // Resolution 10m + 20m → 600,1200s → median 900
    expect(kpis.medianResolutionSeconds.value).toBe(900);
    // 4 SLA tickets (5th has no due dates), 1 breached → 75%
    expect(kpis.slaCompliancePercent.value).toBe(75);

    const dashboard = await getAnalyticsDashboard(ctx, {
      range: "custom",
      from: "2026-11-10",
      to: "2026-11-11",
    });
    expect(dashboard.locked).toBe(false);
    if (dashboard.locked) return;
    expect(dashboard.byStatus.some((row) => row.status === "OPEN")).toBe(true);
    expect(dashboard.agents[0]?.assigned).toBe(5);
  }, 90_000);

  it("locks ranges beyond the Free plan analytics window", async () => {
    await systemDb.orm.public.Workspace.where({ id: workspaceId }).update({
      plan: "FREE",
      subscriptionStatus: null,
    });
    const dashboard = await getAnalyticsDashboard(ctx, { range: "30d" });
    expect(dashboard.locked).toBe(true);
    if (dashboard.locked) {
      expect(dashboard.maxDays).toBe(7);
    }
    await systemDb.orm.public.Workspace.where({ id: workspaceId }).update({
      plan: "PRO",
      subscriptionStatus: "active",
    });
  }, 60_000);
});
