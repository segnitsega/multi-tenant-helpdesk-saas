import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { systemDb } from "@/server/db/system";
import { allocateTicketNumber, withTenantDb } from "@/server/db";
import { db } from "@/server/db/client";

type WorkspaceSeed = {
  workspaceId: string;
  customerId: string;
  ticketId: string;
  messageId: string;
  tagId: string;
  cannedReplyId: string;
};

async function seedWorkspace(label: string): Promise<WorkspaceSeed> {
  const suffix = randomUUID().slice(0, 8);
  const workspace = await systemDb.orm.public.Workspace.create({
    name: `Workspace ${label}`,
    slug: `ws-${label}-${suffix}`,
    inboundAddress: `support-${label}-${suffix}@mail.localhost`,
    widgetKey: `wk_${label}_${suffix}`,
  });

  await systemDb.orm.public.WorkspaceCounter.create({
    workspaceId: workspace.id,
    ticketSeq: 0,
  });

  const customer = await systemDb.orm.public.Customer.create({
    workspaceId: workspace.id,
    email: `customer-${label}-${suffix}@example.com`,
    name: `Customer ${label}`,
  });

  const ticket = await systemDb.orm.public.Ticket.create({
    workspaceId: workspace.id,
    number: 1,
    customerId: customer.id,
    subject: `Hello from ${label}`,
    channel: "EMAIL",
    lastMessageAt: new Date(),
  });

  await systemDb.orm.public.WorkspaceCounter.where({
    workspaceId: workspace.id,
  }).update({ ticketSeq: 1 });

  const message = await systemDb.orm.public.Message.create({
    workspaceId: workspace.id,
    ticketId: ticket.id,
    authorType: "CUSTOMER",
    authorCustomerId: customer.id,
    kind: "REPLY",
    bodyHtml: `<p>${label}</p>`,
    bodyText: label,
  });

  const tag = await systemDb.orm.public.Tag.create({
    workspaceId: workspace.id,
    name: `tag-${label}`,
    color: "#3366ff",
  });

  const cannedReply = await systemDb.orm.public.CannedReply.create({
    workspaceId: workspace.id,
    title: `Canned ${label}`,
    bodyHtml: `<p>Thanks ${label}</p>`,
  });

  return {
    workspaceId: workspace.id,
    customerId: customer.id,
    ticketId: ticket.id,
    messageId: message.id,
    tagId: tag.id,
    cannedReplyId: cannedReply.id,
  };
}

describe("tenant isolation", () => {
  let a: WorkspaceSeed;
  let b: WorkspaceSeed;

  beforeAll(async () => {
    a = await seedWorkspace("a");
    b = await seedWorkspace("b");
  });

  afterAll(async () => {
    try {
      if (a?.workspaceId) {
        await systemDb.orm.public.Workspace.where({
          id: a.workspaceId,
        }).delete();
      }
      if (b?.workspaceId) {
        await systemDb.orm.public.Workspace.where({
          id: b.workspaceId,
        }).delete();
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  });

  it("reads only the current workspace rows", async () => {
    await withTenantDb({ workspaceId: a.workspaceId }, async (tx) => {
      const customers = await tx.orm.public.Customer.all();
      expect(customers.map((row) => row.id)).toEqual([a.customerId]);

      const tickets = await tx.orm.public.Ticket.all();
      expect(tickets.map((row) => row.id)).toEqual([a.ticketId]);

      const messages = await tx.orm.public.Message.all();
      expect(messages.map((row) => row.id)).toEqual([a.messageId]);

      const tags = await tx.orm.public.Tag.all();
      expect(tags.map((row) => row.id)).toEqual([a.tagId]);

      const replies = await tx.orm.public.CannedReply.all();
      expect(replies.map((row) => row.id)).toEqual([a.cannedReplyId]);

      const workspaces = await tx.orm.public.Workspace.all();
      expect(workspaces.map((row) => row.id)).toEqual([a.workspaceId]);

      const counters = await tx.orm.public.WorkspaceCounter.all();
      expect(counters.map((row) => row.workspaceId)).toEqual([a.workspaceId]);
    });
  });

  it("cannot update or delete another workspace rows", async () => {
    await withTenantDb({ workspaceId: a.workspaceId }, async (tx) => {
      const updated = await tx.orm.public.Ticket.where({
        id: b.ticketId,
      }).update({ subject: "hacked" });
      expect(updated).toBeNull();

      const deleted = await tx.orm.public.Customer.where({
        id: b.customerId,
      }).delete();
      expect(deleted).toBeNull();

      const bTicket = await systemDb.orm.public.Ticket.where({
        id: b.ticketId,
      }).first();
      expect(bTicket?.subject).toBe("Hello from b");
    });
  });

  it("rejects inserts that target another workspace", async () => {
    await withTenantDb({ workspaceId: a.workspaceId }, async (tx) => {
      await expect(
        tx.orm.public.Customer.create({
          workspaceId: b.workspaceId,
          email: `leak-${randomUUID().slice(0, 8)}@example.com`,
        }),
      ).rejects.toThrow();
    });
  });

  it("returns no tenant rows when workspace context is unset", async () => {
    const tickets = await db.orm.public.Ticket.all();
    const customers = await db.orm.public.Customer.all();
    const messages = await db.orm.public.Message.all();

    expect(tickets).toEqual([]);
    expect(customers).toEqual([]);
    expect(messages).toEqual([]);
  });

  it("allocates unique sequential ticket numbers under concurrency", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 20 }, () =>
        withTenantDb({ workspaceId: a.workspaceId }, (tx) =>
          allocateTicketNumber(tx, a.workspaceId),
        ),
      ),
    );

    const sorted = [...numbers].sort((x, y) => x - y);
    expect(new Set(numbers).size).toBe(20);
    expect(sorted).toEqual(Array.from({ length: 20 }, (_, i) => i + 2));
  });
});
