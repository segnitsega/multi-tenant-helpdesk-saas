import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import { withTenantDb } from "@/server/db";

vi.mock("@/lib/realtime-publish", () => ({
  publishTicketUpdated: vi.fn(async () => undefined),
  publishTicketCreated: vi.fn(async () => undefined),
  publishMessageCreated: vi.fn(async () => undefined),
}));

vi.mock("@/server/realtime/publisher", () => ({
  publish: vi.fn(async () => ({ id: "1" })),
  listRecentEvents: vi.fn(async () => ({ events: [], needsResync: false })),
}));

vi.mock("@/server/jobs/queues", () => ({
  enqueueAutomation: vi.fn(async () => undefined),
  enqueueEmailOutbound: vi.fn(async () => undefined),
  enqueueEmailInbound: vi.fn(async () => undefined),
  enqueueSlaScan: vi.fn(async () => undefined),
}));

const { runForEvent } = await import("@/server/services/automation.service");

describe("automation runForEvent", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let ticketId: string;
  let ruleId: string;

  beforeAll(async () => {
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Auto ${suffix}`,
      slug: `auto-${suffix}`,
      inboundAddress: `auto-${suffix}@mail.localhost`,
      widgetKey: `wk_auto_${suffix}`,
    });
    workspaceId = workspace.id;

    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 1,
    });

    const customer = await systemDb.orm.public.Customer.create({
      workspaceId,
      email: `auto-${suffix}@example.com`,
      name: "Auto Customer",
    });

    const ticket = await systemDb.orm.public.Ticket.create({
      workspaceId,
      number: 1,
      customerId: customer.id,
      subject: "Need a refund please",
      channel: "EMAIL",
      status: "OPEN",
      priority: "NORMAL",
      lastMessageAt: new Date(),
    });
    ticketId = ticket.id;

    const rule = await systemDb.orm.public.AutomationRule.create({
      workspaceId,
      name: "Refund high priority",
      trigger: "ticket.created",
      enabled: true,
      position: 0,
      conditions: {
        mode: "all",
        conditions: [{ field: "subject", op: "contains", value: "refund" }],
      },
      actions: [
        { type: "set_priority", value: "HIGH" },
        { type: "add_tag", tagName: "refund" },
      ],
    });
    ruleId = rule.id;
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
  }, 90_000);

  it(
    "applies a matching rule once and skips automation-origin reruns",
    async () => {
      const first = await runForEvent(
        { workspaceId, membershipId: null },
        { ticketId, trigger: "ticket.created", origin: "user" },
      );
      expect(first.applied).toEqual([ruleId]);

      const ticket = await withTenantDb({ workspaceId }, async (tx) =>
        tx.orm.public.Ticket.where({ id: ticketId }).first(),
      );
      expect(ticket?.priority).toBe("HIGH");

      const tags = await withTenantDb({ workspaceId }, async (tx) => {
        const links = await tx.orm.public.TicketTag.where({ ticketId }).all();
        const names = [];
        for (const link of links) {
          const tag = await tx.orm.public.Tag.where({ id: link.tagId }).first();
          if (tag) names.push(tag.name);
        }
        return names;
      });
      expect(tags).toContain("refund");

      const skipped = await runForEvent(
        { workspaceId, membershipId: null },
        { ticketId, trigger: "ticket.created", origin: "automation" },
      );
      expect(skipped).toEqual({ applied: [], skipped: true });

      const second = await runForEvent(
        { workspaceId, membershipId: null },
        { ticketId, trigger: "ticket.created", origin: "user" },
      );
      expect(second.applied).toEqual([]);
      expect(second.skipped).toBe(false);
    },
    90_000,
  );
});
