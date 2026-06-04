import "server-only";
import { withTenantDb } from "@/server/db";
import {
  getTicketByNumber,
  listTickets,
} from "@/server/services/ticket.service";
import { listMessages } from "@/server/services/message.service";
import { listMembers } from "@/server/services/membership.service";
import { listCannedReplies } from "@/server/services/canned-reply.service";
import type { TicketFilters } from "@/lib/validators/ticket";
import type { TenantContext } from "@/types/tenant";
import type {
  TicketDetail,
  TicketListItem,
  ViewCounts,
} from "@/features/tickets/types";
import { viewToFilters } from "@/features/tickets/url-state";

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

async function enrichTickets(
  ctx: Pick<TenantContext, "workspaceId">,
  tickets: Awaited<ReturnType<typeof listTickets>>["items"],
): Promise<TicketListItem[]> {
  if (tickets.length === 0) return [];

  return withTenantDb(ctx, async (tx) => {
    const enriched: TicketListItem[] = [];

    for (const ticket of tickets) {
      const customer = await tx.orm.public.Customer.where({
        id: ticket.customerId,
      }).first();
      const tagLinks = await tx.orm.public.TicketTag.where({
        ticketId: ticket.id,
      }).all();
      const tags = [];
      for (const link of tagLinks) {
        const tag = await tx.orm.public.Tag.where({ id: link.tagId }).first();
        if (tag) tags.push({ id: tag.id, name: tag.name, color: tag.color });
      }

      const messages = await tx.orm.public.Message.where({
        ticketId: ticket.id,
      }).all();
      const previewMessage = messages
        .filter((m) => m.kind === "REPLY")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

      enriched.push({
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        channel: ticket.channel,
        assigneeMembershipId: ticket.assigneeMembershipId,
        customerId: ticket.customerId,
        customerName: customer?.name ?? null,
        customerEmail: customer?.email ?? "",
        preview: previewMessage?.bodyText?.slice(0, 140) ?? "",
        tags,
        firstResponseAt: toIso(ticket.firstResponseAt),
        resolvedAt: toIso(ticket.resolvedAt),
        slaFirstResponseDueAt: toIso(ticket.slaFirstResponseDueAt),
        slaResolutionDueAt: toIso(ticket.slaResolutionDueAt),
        lastMessageAt: ticket.lastMessageAt.toISOString(),
        createdAt: ticket.createdAt.toISOString(),
      });
    }

    return enriched;
  });
}

export async function listTicketsQuery(
  ctx: TenantContext,
  input: { filters?: TicketFilters; cursor?: string; limit?: number } = {},
) {
  const page = await listTickets(ctx, input);
  return {
    items: await enrichTickets(ctx, page.items),
    nextCursor: page.nextCursor,
  };
}

export async function getTicketByNumberQuery(
  ctx: TenantContext,
  number: number,
): Promise<TicketDetail> {
  const ticket = await getTicketByNumber(ctx, number);
  const [messages, members, listItem, cannedReplies] = await Promise.all([
    listMessages(ctx, number),
    listMembers(ctx.workspaceId),
    enrichTickets(ctx, [ticket]),
    listCannedReplies(ctx),
  ]);

  const item = listItem[0]!;
  const recent = await listTickets(ctx, {
    filters: {},
    limit: 20,
  });
  const recentForCustomer = recent.items
    .filter((row) => row.customerId === ticket.customerId)
    .slice(0, 5);

  const { customer, messageAttachments } = await withTenantDb(
    ctx,
    async (tx) => {
      const customerRow = await tx.orm.public.Customer.where({
        id: ticket.customerId,
      }).first();
      const attachments = await tx.orm.public.Attachment.where({
        workspaceId: ctx.workspaceId,
        ticketId: ticket.id,
        status: "READY",
      }).all();
      return { customer: customerRow, messageAttachments: attachments };
    },
  );

  const attachmentsByMessage = new Map<string, typeof messageAttachments>();
  for (const attachment of messageAttachments) {
    if (!attachment.messageId) continue;
    const list = attachmentsByMessage.get(attachment.messageId) ?? [];
    list.push(attachment);
    attachmentsByMessage.set(attachment.messageId, list);
  }

  const agent =
    members.find((member) => member.id === ctx.membershipId) ?? null;

  return {
    ticket: {
      ...item,
      closedAt: toIso(ticket.closedAt),
      mergedIntoTicketId: ticket.mergedIntoTicketId,
    },
    customer: {
      id: customer?.id ?? ticket.customerId,
      email: customer?.email ?? item.customerEmail,
      name: customer?.name ?? item.customerName,
      phone: customer?.phone ?? null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      authorType: m.authorType,
      authorMembershipId: m.authorMembershipId,
      authorCustomerId: m.authorCustomerId,
      kind: m.kind,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      deliveryStatus: m.deliveryStatus,
      createdAt: m.createdAt.toISOString(),
      attachments: (attachmentsByMessage.get(m.id) ?? []).map((row) => ({
        id: row.id,
        filename: row.filename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
      })),
    })),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
    })),
    recentTickets: recentForCustomer.map((row) => ({
      number: row.number,
      subject: row.subject,
      status: row.status,
    })),
    cannedReplies: cannedReplies.map((row) => ({
      id: row.id,
      title: row.title,
      shortcut: row.shortcut,
      bodyHtml: row.bodyHtml,
    })),
    agentName: agent?.name ?? agent?.email ?? null,
  };
}

export async function getViewCountsQuery(
  ctx: TenantContext,
): Promise<ViewCounts> {
  const views = [
    "open",
    "mine",
    "unassigned",
    "pending",
    "resolved",
    "closed",
  ] as const;

  const counts = await Promise.all(
    views.map(async (view) => {
      const page = await listTickets(ctx, {
        filters: viewToFilters(view),
        limit: 100,
      });
      return [view, page.items.length] as const;
    }),
  );

  return Object.fromEntries(counts) as ViewCounts;
}
