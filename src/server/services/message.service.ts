import "server-only";
import { withTenantDb, type DbTx } from "@/server/db";
import { NotFoundError } from "@/lib/api-error";
import { sanitizeAndPlainText } from "@/lib/sanitize";
import { linkAttachmentsToMessage } from "@/server/services/attachment.service";
import type { TenantContext } from "@/types/tenant";

async function getTicketByNumberTx(
  tx: DbTx,
  workspaceId: string,
  number: number,
) {
  const ticket = await tx.orm.public.Ticket.where({
    workspaceId,
    number,
  }).first();
  if (!ticket) throw new NotFoundError("Ticket not found");
  return ticket;
}

export async function listMessages(
  ctx: Pick<TenantContext, "workspaceId">,
  ticketNumber: number,
) {
  return withTenantDb(ctx, async (tx) => {
    const ticket = await getTicketByNumberTx(tx, ctx.workspaceId, ticketNumber);
    const messages = await tx.orm.public.Message.where({
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
    }).all();
    return messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  });
}

export async function addReply(
  ctx: TenantContext,
  input: {
    ticketNumber: number;
    bodyHtml: string;
    attachmentIds?: string[];
  },
) {
  const { bodyHtml, bodyText } = sanitizeAndPlainText(input.bodyHtml);

  const message = await withTenantDb(ctx, async (tx) => {
    const ticket = await getTicketByNumberTx(
      tx,
      ctx.workspaceId,
      input.ticketNumber,
    );
    const now = new Date();

    const created = await tx.orm.public.Message.create({
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
      authorType: "AGENT",
      authorMembershipId: ctx.membershipId,
      kind: "REPLY",
      bodyHtml,
      bodyText,
    });

    const ticketPatch: {
      lastMessageAt: Date;
      firstResponseAt?: Date;
    } = { lastMessageAt: now };

    if (!ticket.firstResponseAt) {
      ticketPatch.firstResponseAt = now;
    }

    await tx.orm.public.Ticket.where({ id: ticket.id }).update(ticketPatch);
    return created;
  });

  if (input.attachmentIds?.length) {
    await linkAttachmentsToMessage(ctx, {
      messageId: message.id,
      attachmentIds: input.attachmentIds,
    });
  }

  return message;
}

export async function addNote(
  ctx: TenantContext,
  input: {
    ticketNumber: number;
    bodyHtml: string;
    attachmentIds?: string[];
  },
) {
  const { bodyHtml, bodyText } = sanitizeAndPlainText(input.bodyHtml);

  const message = await withTenantDb(ctx, async (tx) => {
    const ticket = await getTicketByNumberTx(
      tx,
      ctx.workspaceId,
      input.ticketNumber,
    );

    return tx.orm.public.Message.create({
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
      authorType: "AGENT",
      authorMembershipId: ctx.membershipId,
      kind: "NOTE",
      bodyHtml,
      bodyText,
    });
  });

  if (input.attachmentIds?.length) {
    await linkAttachmentsToMessage(ctx, {
      messageId: message.id,
      attachmentIds: input.attachmentIds,
    });
  }

  return message;
}

export async function addEvent(
  ctx: Pick<TenantContext, "workspaceId" | "membershipId">,
  input: { ticketId: string; bodyText: string },
) {
  return withTenantDb(ctx, async (tx) => {
    return addEventTx(tx, ctx, input);
  });
}

export async function addEventTx(
  tx: DbTx,
  ctx: Pick<TenantContext, "workspaceId" | "membershipId">,
  input: { ticketId: string; bodyText: string },
) {
  return tx.orm.public.Message.create({
    workspaceId: ctx.workspaceId,
    ticketId: input.ticketId,
    authorType: "SYSTEM",
    authorMembershipId: ctx.membershipId,
    kind: "EVENT",
    bodyHtml: `<p>${escapeHtml(input.bodyText)}</p>`,
    bodyText: input.bodyText,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
