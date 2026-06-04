"use server";

import { z } from "zod";
import { tenantAction } from "@/server/tenancy/action";
import { getTenantContext } from "@/server/tenancy/context";
import {
  bulkUpdateTickets,
  createTicket,
  deleteTicket,
  listTickets,
  mergeTickets,
  updateTicket,
} from "@/server/services/ticket.service";
import {
  addNote,
  addReply,
  retryOutboundMessage,
} from "@/server/services/message.service";
import { confirmAttachment } from "@/server/services/attachment.service";
import {
  getTicketByNumberQuery,
  getViewCountsQuery,
  listTicketsQuery,
} from "@/server/queries/tickets";
import {
  bulkUpdateTicketsSchema,
  createTicketSchema,
  listTicketsSchema,
  mergeTicketsSchema,
  ticketNumberSchema,
  updateTicketSchema,
} from "@/lib/validators/ticket";
import { addNoteSchema, addReplySchema } from "@/lib/validators/message";
import { confirmUploadSchema } from "@/lib/validators/upload";

const updateTicketActionSchema = updateTicketSchema.and(
  z.object({ number: z.number().int().positive() }),
);

export const createTicketAction = tenantAction(
  "ticket.update",
  createTicketSchema,
  async (ctx, input) => {
    const ticket = await createTicket(ctx, input);
    return { number: ticket.number };
  },
);

export const updateTicketAction = tenantAction(
  "ticket.update",
  updateTicketActionSchema,
  async (ctx, input) => {
    const { number, ...patch } = input;
    const ticket = await updateTicket(ctx, number, patch);
    return { number: ticket.number, status: ticket.status };
  },
);

export const deleteTicketAction = tenantAction(
  "ticket.delete",
  ticketNumberSchema,
  async (ctx, input) => {
    await deleteTicket(ctx, input.number);
    return { deleted: true as const };
  },
);

export const mergeTicketsAction = tenantAction(
  "ticket.update",
  mergeTicketsSchema,
  async (ctx, input) => {
    const result = await mergeTickets(ctx, input);
    return {
      sourceNumber: result.source.number,
      targetNumber: result.target.number,
    };
  },
);

export const bulkUpdateTicketsAction = tenantAction(
  "ticket.update",
  bulkUpdateTicketsSchema,
  async (ctx, input) => {
    const rows = await bulkUpdateTickets(ctx, input);
    return { numbers: rows.map((row) => row.number) };
  },
);

export const addReplyAction = tenantAction(
  "ticket.reply",
  addReplySchema,
  async (ctx, input) => {
    const message = await addReply(ctx, {
      ticketNumber: input.ticketNumber,
      bodyHtml: input.bodyHtml,
      attachmentIds: input.attachmentIds,
    });
    if (input.afterStatus) {
      await updateTicket(ctx, input.ticketNumber, {
        status: input.afterStatus,
      });
    }
    return { id: message.id };
  },
);

export const addNoteAction = tenantAction(
  "ticket.reply",
  addNoteSchema,
  async (ctx, input) => {
    const message = await addNote(ctx, input);
    return { id: message.id };
  },
);

export const confirmAttachmentAction = tenantAction(
  "ticket.reply",
  confirmUploadSchema,
  async (ctx, input) => {
    const attachment = await confirmAttachment(ctx, input.attachmentId);
    if (!attachment) throw new Error("Attachment not found");
    return { id: attachment.id, status: attachment.status };
  },
);

export const retryOutboundMessageAction = tenantAction(
  "ticket.reply",
  z.object({ messageId: z.string().uuid() }),
  async (ctx, input) => {
    const message = await retryOutboundMessage(ctx, input.messageId);
    return { id: message.id };
  },
);

export async function fetchTicketPageAction(
  slug: string,
  raw: unknown,
) {
  const ctx = await getTenantContext(slug);
  const parsed = listTicketsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: { code: "VALIDATION", message: "Invalid filters" } };
  }
  const data = await listTicketsQuery(ctx, parsed.data);
  return { ok: true as const, data };
}

export async function fetchTicketDetailAction(slug: string, number: number) {
  const ctx = await getTenantContext(slug);
  const data = await getTicketByNumberQuery(ctx, number);
  return { ok: true as const, data };
}

export async function fetchViewCountsAction(slug: string) {
  const ctx = await getTenantContext(slug);
  const data = await getViewCountsQuery(ctx);
  return { ok: true as const, data };
}

export async function listTicketNumbersAction(
  slug: string,
  raw: unknown,
) {
  const ctx = await getTenantContext(slug);
  const parsed = listTicketsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: { code: "VALIDATION", message: "Invalid filters" } };
  }
  const page = await listTickets(ctx, parsed.data);
  return {
    ok: true as const,
    data: { numbers: page.items.map((row) => row.number) },
  };
}
