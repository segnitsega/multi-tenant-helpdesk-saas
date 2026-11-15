import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";

vi.mock("@/lib/realtime-publish", () => ({
  publishTicketUpdated: vi.fn(async () => undefined),
  publishTicketCreated: vi.fn(async () => undefined),
  publishMessageCreated: vi.fn(async () => undefined),
}));

vi.mock("@/server/jobs/queues", () => ({
  enqueueAutomation: vi.fn(async () => undefined),
  enqueueEmailOutbound: vi.fn(async () => undefined),
}));

const {
  addPortalReply,
  createPortalRequest,
  getPortalTicket,
  listPortalTickets,
} = await import("@/server/services/portal.service");
import type { PortalContext } from "@/server/services/portal.service";

describe("portal isolation", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let customerA: string;
  let customerB: string;
  let ctxA: PortalContext;
  let ctxB: PortalContext;
  let ticketNumberA: number;

  beforeAll(async () => {
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Portal ${suffix}`,
      slug: `portal-${suffix}`,
      inboundAddress: `portal-${suffix}@mail.localhost`,
      widgetKey: `wk_portal_${suffix}`,
      plan: "PRO",
      subscriptionStatus: "active",
    });
    workspaceId = workspace.id;
    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 0,
    });

    const a = await systemDb.orm.public.Customer.create({
      workspaceId,
      email: `a-${suffix}@example.com`,
      name: "Customer A",
    });
    const b = await systemDb.orm.public.Customer.create({
      workspaceId,
      email: `b-${suffix}@example.com`,
      name: "Customer B",
    });
    customerA = a.id;
    customerB = b.id;
    ctxA = { workspaceId, customerId: customerA, slug: workspace.slug };
    ctxB = { workspaceId, customerId: customerB, slug: workspace.slug };

    const ticket = await createPortalRequest(ctxA, {
      subject: "Need help with billing",
      bodyHtml: "<p>Invoice looks wrong</p>",
    });
    ticketNumberA = ticket.number;

    await systemDb.orm.public.Message.create({
      workspaceId,
      ticketId: ticket.id,
      authorType: "AGENT",
      kind: "NOTE",
      bodyHtml: "<p>Internal only</p>",
      bodyText: "Internal only",
    });
    await systemDb.orm.public.Message.create({
      workspaceId,
      ticketId: ticket.id,
      authorType: "SYSTEM",
      kind: "EVENT",
      bodyHtml: "<p>Ticket created</p>",
      bodyText: "Ticket created",
    });
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

  it("never returns notes/events or other customers' tickets", async () => {
    const listA = await listPortalTickets(ctxA);
    expect(listA).toHaveLength(1);
    expect(listA[0]?.number).toBe(ticketNumberA);

    const listB = await listPortalTickets(ctxB);
    expect(listB).toHaveLength(0);

    const detail = await getPortalTicket(ctxA, ticketNumberA);
    expect(detail.messages.every((m) => m.authorType !== "SYSTEM")).toBe(true);
    expect(detail.messages.some((m) => m.bodyText.includes("Internal"))).toBe(
      false,
    );
    expect(detail.messages.every((m) => m.bodyHtml.includes("Internal") === false)).toBe(
      true,
    );

    await expect(getPortalTicket(ctxB, ticketNumberA)).rejects.toThrow(
      /not found/i,
    );

    await addPortalReply(ctxA, ticketNumberA, {
      bodyHtml: "<p>Thanks for looking</p>",
    });
    const after = await getPortalTicket(ctxA, ticketNumberA);
    expect(after.messages.some((m) => m.bodyText.includes("Thanks"))).toBe(
      true,
    );
  }, 90_000);
});
