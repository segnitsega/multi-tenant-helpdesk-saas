import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { systemDb } from "@/server/db/system";
import { createWorkspace } from "@/server/services/workspace.service";
import { createTicket, listTickets, mergeTickets, updateTicket } from "@/server/services/ticket.service";
import { addNote, addReply, listMessages } from "@/server/services/message.service";
import { hashPassword } from "@/server/auth/password";
import type { TenantContext } from "@/types/tenant";

describe("ticket services", () => {
  let ownerId: string;
  let workspaceId: string;
  let workspaceSlug: string;
  let membershipId: string;
  let ctx: TenantContext;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    const passwordHash = await hashPassword("password123");
    const owner = await systemDb.orm.public.User.create({
      email: `tickets-owner-${suffix}@example.com`,
      name: "Ticket Owner",
      passwordHash,
    });
    ownerId = owner.id;
    createdUserIds.push(owner.id);

    const created = await createWorkspace(ownerId, {
      name: `Tickets ${suffix}`,
      slug: `tickets-${suffix}`,
    });
    workspaceId = created.workspace.id;
    workspaceSlug = created.workspace.slug;
    membershipId = created.membership.id;

    ctx = {
      userId: ownerId,
      workspaceId,
      membershipId,
      role: "OWNER",
      readonly: false,
      slug: workspaceSlug,
    };
  });

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
      for (const id of createdUserIds) {
        await systemDb.orm.public.User.where({ id }).delete();
      }
    } finally {
      await systemDb.close();
    }
  });

  it("records firstResponseAt on reply but not on note", async () => {
    const ticket = await createTicket(ctx, {
      subject: "First response check",
      bodyHtml: "<p>Help please</p>",
      customerEmail: `cust-${randomUUID().slice(0, 6)}@example.com`,
      customerName: "Customer",
      priority: "NORMAL",
      channel: "MANUAL",
    });

    expect(ticket.firstResponseAt).toBeNull();

    await addNote(ctx, {
      ticketNumber: ticket.number,
      bodyHtml: "<p>Internal only</p>",
    });
    const afterNote = await systemDb.orm.public.Ticket.where({
      id: ticket.id,
    }).first();
    expect(afterNote?.firstResponseAt).toBeNull();

    await addReply(ctx, {
      ticketNumber: ticket.number,
      bodyHtml: "<p>We are on it</p>",
    });
    const afterReply = await systemDb.orm.public.Ticket.where({
      id: ticket.id,
    }).first();
    expect(afterReply?.firstResponseAt).toBeTruthy();

    const messages = await listMessages(ctx, ticket.number);
    expect(messages.some((m) => m.kind === "NOTE")).toBe(true);
    expect(messages.some((m) => m.kind === "REPLY" && m.authorType === "AGENT")).toBe(
      true,
    );
  });

  it("sets and clears resolvedAt across status transitions", async () => {
    const ticket = await createTicket(ctx, {
      subject: "Status flow",
      bodyHtml: "<p>Issue</p>",
      customerEmail: `status-${randomUUID().slice(0, 6)}@example.com`,
      priority: "HIGH",
      channel: "EMAIL",
    });

    const resolved = await updateTicket(ctx, ticket.number, {
      status: "RESOLVED",
    });
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTruthy();

    const reopened = await updateTicket(ctx, ticket.number, {
      status: "OPEN",
    });
    expect(reopened.status).toBe("OPEN");
    expect(reopened.resolvedAt).toBeNull();
  });

  it("merges source messages into the target ticket", async () => {
    const source = await createTicket(ctx, {
      subject: "Source",
      bodyHtml: "<p>Source body</p>",
      customerEmail: `merge-a-${randomUUID().slice(0, 6)}@example.com`,
      priority: "NORMAL",
      channel: "MANUAL",
    });
    const target = await createTicket(ctx, {
      subject: "Target",
      bodyHtml: "<p>Target body</p>",
      customerEmail: `merge-b-${randomUUID().slice(0, 6)}@example.com`,
      priority: "NORMAL",
      channel: "MANUAL",
    });

    await addReply(ctx, {
      ticketNumber: source.number,
      bodyHtml: "<p>Source reply</p>",
    });

    const result = await mergeTickets(ctx, {
      sourceNumber: source.number,
      targetNumber: target.number,
    });

    expect(result.source.mergedIntoTicketId).toBe(target.id);
    expect(result.source.status).toBe("CLOSED");

    const targetMessages = await listMessages(ctx, target.number);
    expect(
      targetMessages.some((m) => m.bodyText.includes("Source reply")),
    ).toBe(true);
  });

  it("lists with stable cursor pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await createTicket(ctx, {
        subject: `Page ticket ${i}`,
        bodyHtml: `<p>Body ${i}</p>`,
        customerEmail: `page-${i}-${randomUUID().slice(0, 6)}@example.com`,
        priority: "NORMAL",
        channel: "MANUAL",
      });
    }

    const first = await listTickets(ctx, { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();

    const second = await listTickets(ctx, {
      limit: 2,
      cursor: first.nextCursor!,
    });
    expect(second.items).toHaveLength(2);

    const ids = new Set([
      ...first.items.map((t) => t.id),
      ...second.items.map((t) => t.id),
    ]);
    expect(ids.size).toBe(4);
  });

  it("filters by status", async () => {
    const openTicket = await createTicket(ctx, {
      subject: "Keep open",
      bodyHtml: "<p>Open</p>",
      customerEmail: `filter-open-${randomUUID().slice(0, 6)}@example.com`,
      priority: "LOW",
      channel: "MANUAL",
    });
    const pendingTicket = await createTicket(ctx, {
      subject: "Make pending",
      bodyHtml: "<p>Pending</p>",
      customerEmail: `filter-pending-${randomUUID().slice(0, 6)}@example.com`,
      priority: "LOW",
      channel: "MANUAL",
    });
    await updateTicket(ctx, pendingTicket.number, { status: "PENDING" });

    const pendingOnly = await listTickets(ctx, {
      filters: { status: "PENDING" },
      limit: 50,
    });
    expect(
      pendingOnly.items.some((t) => t.number === pendingTicket.number),
    ).toBe(true);
    expect(pendingOnly.items.some((t) => t.number === openTicket.number)).toBe(
      false,
    );
  });
});
