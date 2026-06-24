import "server-only";
import { allocateTicketNumber, withTenantDb, type DbTx } from "@/server/db";
import {
  BadRequestError,
  NotFoundError,
} from "@/lib/api-error";
import { computeSlaDueDates } from "@/lib/sla";
import { htmlToText } from "@/lib/html";
import { addEventTx } from "@/server/services/message.service";
import {
  publishTicketCreated,
  publishTicketUpdated,
} from "@/lib/realtime-publish";
import type {
  CreateTicketInput,
  TicketFilters,
  UpdateTicketInput,
} from "@/lib/validators/ticket";
import type { TenantContext } from "@/types/tenant";

type TicketRow = {
  id: string;
  workspaceId: string;
  number: number;
  customerId: string;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  assigneeMembershipId: string | null;
  mergedIntoTicketId: string | null;
  firstResponseAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  slaFirstResponseDueAt: Date | null;
  slaResolutionDueAt: Date | null;
  slaFirstResponseBreached: boolean;
  slaResolutionBreached: boolean;
  lastMessageAt: Date;
  lastCustomerMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function encodeCursor(lastMessageAt: Date, id: string): string {
  return Buffer.from(
    `${lastMessageAt.toISOString()}|${id}`,
    "utf8",
  ).toString("base64url");
}

function decodeCursor(cursor: string): { lastMessageAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [iso, id] = raw.split("|");
    if (!iso || !id) throw new Error("bad cursor");
    const lastMessageAt = new Date(iso);
    if (Number.isNaN(lastMessageAt.getTime())) throw new Error("bad date");
    return { lastMessageAt, id };
  } catch {
    throw new BadRequestError("Invalid cursor");
  }
}

async function getTicketByNumberTx(
  tx: DbTx,
  workspaceId: string,
  number: number,
): Promise<TicketRow> {
  const ticket = await tx.orm.public.Ticket.where({
    workspaceId,
    number,
  }).first();
  if (!ticket) throw new NotFoundError("Ticket not found");
  return ticket as TicketRow;
}

async function replaceTicketTags(
  tx: DbTx,
  workspaceId: string,
  ticketId: string,
  tagIds: string[],
) {
  const existing = await tx.orm.public.TicketTag.where({
    workspaceId,
    ticketId,
  }).all();

  for (const row of existing) {
    await tx.orm.public.TicketTag.where({
      ticketId: row.ticketId,
      tagId: row.tagId,
    }).delete();
  }

  for (const tagId of tagIds) {
    const tag = await tx.orm.public.Tag.where({
      id: tagId,
      workspaceId,
    }).first();
    if (!tag) throw new BadRequestError("One or more tags were not found.");
    await tx.orm.public.TicketTag.create({
      workspaceId,
      ticketId,
      tagId,
    });
  }
}

function statusPatch(
  current: TicketRow,
  nextStatus: string,
  now: Date,
): Partial<TicketRow> {
  const patch: Partial<TicketRow> = { status: nextStatus };

  if (nextStatus === "RESOLVED" && current.status !== "RESOLVED") {
    patch.resolvedAt = now;
  }
  if (nextStatus === "CLOSED" && current.status !== "CLOSED") {
    patch.closedAt = now;
    if (!current.resolvedAt) patch.resolvedAt = now;
  }
  if (
    (current.status === "RESOLVED" || current.status === "CLOSED") &&
    nextStatus !== "RESOLVED" &&
    nextStatus !== "CLOSED"
  ) {
    patch.resolvedAt = null;
    patch.closedAt = null;
  }

  return patch;
}

export async function createTicket(ctx: TenantContext, input: CreateTicketInput) {
  const ticket = await withTenantDb(ctx, async (tx) => {
    const email = input.customerEmail.trim().toLowerCase();
    let customer = await tx.orm.public.Customer.where({
      workspaceId: ctx.workspaceId,
      email,
    }).first();

    if (!customer) {
      customer = await tx.orm.public.Customer.create({
        workspaceId: ctx.workspaceId,
        email,
        name: input.customerName?.trim() || null,
      });
    } else if (input.customerName && !customer.name) {
      customer = await tx.orm.public.Customer.where({ id: customer.id }).update({
        name: input.customerName.trim(),
      });
    }

    const number = await allocateTicketNumber(tx, ctx.workspaceId);
    const now = new Date();
    const policy = await tx.orm.public.SlaPolicy.where({
      workspaceId: ctx.workspaceId,
      priority: input.priority,
      enabled: true,
    }).first();
    const dues = computeSlaDueDates(now, policy);
    const bodyText = htmlToText(input.bodyHtml);

    const created = await tx.orm.public.Ticket.create({
      workspaceId: ctx.workspaceId,
      number,
      customerId: customer!.id,
      subject: input.subject.trim(),
      status: "OPEN",
      priority: input.priority,
      channel: input.channel,
      assigneeMembershipId: input.assigneeMembershipId ?? null,
      lastMessageAt: now,
      lastCustomerMessageAt: now,
      slaFirstResponseDueAt: dues.slaFirstResponseDueAt,
      slaResolutionDueAt: dues.slaResolutionDueAt,
    });

    await tx.orm.public.Message.create({
      workspaceId: ctx.workspaceId,
      ticketId: created.id,
      authorType: "CUSTOMER",
      authorCustomerId: customer!.id,
      kind: "REPLY",
      bodyHtml: input.bodyHtml,
      bodyText,
    });

    if (input.tagIds?.length) {
      await replaceTicketTags(tx, ctx.workspaceId, created.id, input.tagIds);
    }

    await addEventTx(tx, ctx, {
      ticketId: created.id,
      bodyText: `Ticket #${number} created`,
    });

    return created as TicketRow;
  });

  await publishTicketCreated(ctx, ticket);
  return ticket;
}

export async function getTicketByNumber(
  ctx: Pick<TenantContext, "workspaceId">,
  number: number,
) {
  return withTenantDb(ctx, async (tx) => {
    return getTicketByNumberTx(tx, ctx.workspaceId, number);
  });
}

export async function updateTicket(
  ctx: TenantContext,
  number: number,
  input: UpdateTicketInput,
) {
  const { ticket, patch } = await withTenantDb(ctx, async (tx) => {
    const ticket = await getTicketByNumberTx(tx, ctx.workspaceId, number);
    const now = new Date();
    const patch: Record<string, unknown> = {};
    const events: string[] = [];

    if (input.subject !== undefined && input.subject !== ticket.subject) {
      patch.subject = input.subject;
      events.push(`Subject changed to “${input.subject}”`);
    }

    if (input.status !== undefined && input.status !== ticket.status) {
      Object.assign(patch, statusPatch(ticket, input.status, now));
      events.push(`Status changed to ${input.status}`);
    }

    if (input.priority !== undefined && input.priority !== ticket.priority) {
      patch.priority = input.priority;
      const policy = await tx.orm.public.SlaPolicy.where({
        workspaceId: ctx.workspaceId,
        priority: input.priority,
        enabled: true,
      }).first();
      const dues = computeSlaDueDates(ticket.createdAt, policy);
      patch.slaFirstResponseDueAt = dues.slaFirstResponseDueAt;
      patch.slaResolutionDueAt = dues.slaResolutionDueAt;
      events.push(`Priority changed to ${input.priority}`);
    }

    if (
      input.assigneeMembershipId !== undefined &&
      input.assigneeMembershipId !== ticket.assigneeMembershipId
    ) {
      patch.assigneeMembershipId = input.assigneeMembershipId;
      events.push(
        input.assigneeMembershipId
          ? "Assignee updated"
          : "Ticket unassigned",
      );
    }

    if (Object.keys(patch).length > 0) {
      await tx.orm.public.Ticket.where({ id: ticket.id }).update(patch);
    }

    if (input.tagIds) {
      await replaceTicketTags(tx, ctx.workspaceId, ticket.id, input.tagIds);
      events.push("Tags updated");
    }

    for (const bodyText of events) {
      await addEventTx(tx, ctx, { ticketId: ticket.id, bodyText });
    }

    const updated = await getTicketByNumberTx(tx, ctx.workspaceId, number);
    return { ticket: updated, patch };
  });

  if (Object.keys(patch).length > 0 || input.tagIds) {
    await publishTicketUpdated(ctx, ticket, {
      ...patch,
      ...(input.tagIds ? { tagIds: input.tagIds } : {}),
    });
  }

  return ticket;
}

export async function listTickets(
  ctx: TenantContext,
  input: {
    filters?: TicketFilters;
    cursor?: string;
    limit?: number;
  } = {},
) {
  const filters = input.filters ?? {};
  const limit = input.limit ?? 30;
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  return withTenantDb(ctx, async (tx) => {
    const statusCsv = (
      filters.status
        ? Array.isArray(filters.status)
          ? filters.status
          : [filters.status]
        : []
    ).join(",");
    const priorityCsv = (
      filters.priority
        ? Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority]
        : []
    ).join(",");
    const channelCsv = (
      filters.channel
        ? Array.isArray(filters.channel)
          ? filters.channel
          : [filters.channel]
        : []
    ).join(",");

    const nilUuid = "00000000-0000-0000-0000-000000000000";
    const filterUnassigned = filters.assigneeMembershipId === "unassigned";
    const filterAssigneeId =
      filters.assigneeMembershipId === "me"
        ? ctx.membershipId
        : filters.assigneeMembershipId &&
            filters.assigneeMembershipId !== "unassigned"
          ? filters.assigneeMembershipId
          : nilUuid;
    const filterAssignee =
      filterUnassigned || filterAssigneeId !== nilUuid;

    const tagId = filters.tagId ?? nilUuid;
    const hasTagFilter = Boolean(filters.tagId);
    const createdFromIso = (filters.createdFrom ?? new Date(0)).toISOString();
    const hasCreatedFrom = Boolean(filters.createdFrom);
    const createdToIso = (filters.createdTo ?? new Date(0)).toISOString();
    const hasCreatedTo = Boolean(filters.createdTo);
    const q = filters.q?.trim() ?? "";
    const hasQuery = q.length > 0;
    const hasCursor = Boolean(cursor);
    const cursorAtIso = (cursor?.lastMessageAt ?? new Date(0)).toISOString();
    const cursorId = cursor?.id ?? nilUuid;

    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT
            t.id,
            t.workspace_id AS "workspaceId",
            t.number,
            t.customer_id AS "customerId",
            t.subject,
            t.status,
            t.priority,
            t.channel,
            t.assignee_membership_id AS "assigneeMembershipId",
            t.merged_into_ticket_id AS "mergedIntoTicketId",
            t.first_response_at AS "firstResponseAt",
            t.resolved_at AS "resolvedAt",
            t.closed_at AS "closedAt",
            t.sla_first_response_due_at AS "slaFirstResponseDueAt",
            t.sla_resolution_due_at AS "slaResolutionDueAt",
            t.sla_first_response_breached AS "slaFirstResponseBreached",
            t.sla_resolution_breached AS "slaResolutionBreached",
            t.last_message_at AS "lastMessageAt",
            t.last_customer_message_at AS "lastCustomerMessageAt",
            t.created_at AS "createdAt",
            t.updated_at AS "updatedAt"
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}
            AND t.merged_into_ticket_id IS NULL
            AND (
              length(${statusCsv}) = 0
              OR t.status = ANY (string_to_array(${statusCsv}, ','))
            )
            AND (
              length(${priorityCsv}) = 0
              OR t.priority = ANY (string_to_array(${priorityCsv}, ','))
            )
            AND (
              length(${channelCsv}) = 0
              OR t.channel = ANY (string_to_array(${channelCsv}, ','))
            )
            AND (
              NOT ${filterAssignee}::boolean
              OR (
                ${filterUnassigned}::boolean AND t.assignee_membership_id IS NULL
              )
              OR (
                NOT ${filterUnassigned}::boolean
                AND t.assignee_membership_id = ${filterAssigneeId}::uuid
              )
            )
            AND (
              NOT ${hasTagFilter}::boolean
              OR EXISTS (
                SELECT 1 FROM ticket_tags tt
                WHERE tt.ticket_id = t.id
                  AND tt.tag_id = ${tagId}::uuid
              )
            )
            AND (
              NOT ${hasCreatedFrom}::boolean
              OR t.created_at >= ${createdFromIso}::timestamptz
            )
            AND (
              NOT ${hasCreatedTo}::boolean
              OR t.created_at <= ${createdToIso}::timestamptz
            )
            AND (
              NOT ${hasQuery}::boolean
              OR t.search @@ plainto_tsquery('english', ${q})
              OR EXISTS (
                SELECT 1 FROM messages m
                WHERE m.ticket_id = t.id
                  AND m.search @@ plainto_tsquery('english', ${q})
              )
            )
            AND (
              NOT ${hasCursor}::boolean
              OR (t.last_message_at, t.id) < (${cursorAtIso}::timestamptz, ${cursorId}::uuid)
            )
          ORDER BY t.last_message_at DESC, t.id DESC
          LIMIT ${limit + 1}
        `
        .returnsRow({
          id: "pg/uuid@1",
          workspaceId: "pg/uuid@1",
          number: "pg/int4@1",
          customerId: "pg/uuid@1",
          subject: "pg/text@1",
          status: "pg/text@1",
          priority: "pg/text@1",
          channel: "pg/text@1",
          assigneeMembershipId: { codecId: "pg/uuid@1", nullable: true },
          mergedIntoTicketId: { codecId: "pg/uuid@1", nullable: true },
          firstResponseAt: { codecId: "pg/timestamptz-date@1", nullable: true },
          resolvedAt: { codecId: "pg/timestamptz-date@1", nullable: true },
          closedAt: { codecId: "pg/timestamptz-date@1", nullable: true },
          slaFirstResponseDueAt: {
            codecId: "pg/timestamptz-date@1",
            nullable: true,
          },
          slaResolutionDueAt: {
            codecId: "pg/timestamptz-date@1",
            nullable: true,
          },
          slaFirstResponseBreached: "pg/bool@1",
          slaResolutionBreached: "pg/bool@1",
          lastMessageAt: "pg/timestamptz-date@1",
          lastCustomerMessageAt: {
            codecId: "pg/timestamptz-date@1",
            nullable: true,
          },
          createdAt: "pg/timestamptz-date@1",
          updatedAt: "pg/timestamptz-date@1",
        })
        .build(),
    );

    const items = rows as TicketRow[];
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const nextCursor =
      hasMore && page.length > 0
        ? encodeCursor(page[page.length - 1]!.lastMessageAt, page[page.length - 1]!.id)
        : null;

    return { items: page, nextCursor };
  });
}

export async function mergeTickets(
  ctx: TenantContext,
  input: { sourceNumber: number; targetNumber: number },
) {
  if (input.sourceNumber === input.targetNumber) {
    throw new BadRequestError("Cannot merge a ticket into itself.");
  }

  return withTenantDb(ctx, async (tx) => {
    const source = await getTicketByNumberTx(
      tx,
      ctx.workspaceId,
      input.sourceNumber,
    );
    const target = await getTicketByNumberTx(
      tx,
      ctx.workspaceId,
      input.targetNumber,
    );

    if (source.mergedIntoTicketId) {
      throw new BadRequestError("Source ticket is already merged.");
    }
    if (target.mergedIntoTicketId) {
      throw new BadRequestError("Target ticket is already merged.");
    }

    const messages = await tx.orm.public.Message.where({
      workspaceId: ctx.workspaceId,
      ticketId: source.id,
    }).all();

    for (const message of messages) {
      await tx.orm.public.Message.where({ id: message.id }).update({
        ticketId: target.id,
      });
    }

    const now = new Date();
    await tx.orm.public.Ticket.where({ id: source.id }).update({
      mergedIntoTicketId: target.id,
      status: "CLOSED",
      closedAt: now,
      resolvedAt: source.resolvedAt ?? now,
    });

    const latest =
      messages.reduce<Date | null>((acc, message) => {
        if (!acc || message.createdAt > acc) return message.createdAt;
        return acc;
      }, null) ?? target.lastMessageAt;

    if (latest > target.lastMessageAt) {
      await tx.orm.public.Ticket.where({ id: target.id }).update({
        lastMessageAt: latest,
      });
    }

    await addEventTx(tx, ctx, {
      ticketId: source.id,
      bodyText: `Merged into #${target.number}`,
    });
    await addEventTx(tx, ctx, {
      ticketId: target.id,
      bodyText: `Merged ticket #${source.number} into this ticket`,
    });

    return {
      source: await getTicketByNumberTx(tx, ctx.workspaceId, source.number),
      target: await getTicketByNumberTx(tx, ctx.workspaceId, target.number),
    };
  });
}

export async function bulkUpdateTickets(
  ctx: TenantContext,
  input: { numbers: number[]; patch: UpdateTicketInput },
) {
  const results = [];
  for (const number of input.numbers) {
    results.push(await updateTicket(ctx, number, input.patch));
  }
  return results;
}

export async function deleteTicket(ctx: TenantContext, number: number) {
  return withTenantDb(ctx, async (tx) => {
    const ticket = await getTicketByNumberTx(tx, ctx.workspaceId, number);
    await tx.orm.public.Ticket.where({ id: ticket.id }).delete();
  });
}
