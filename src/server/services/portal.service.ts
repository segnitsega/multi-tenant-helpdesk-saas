import "server-only";
import { systemDb } from "@/server/db/system";
import { allocateTicketNumber, withTenantDb } from "@/server/db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api-error";
import { generateToken, hashToken } from "@/server/auth/tokens";
import { getEmailProvider } from "@/server/email";
import { magicLinkEmail } from "@/server/email/templates/magic-link";
import { sanitizeAndPlainText } from "@/lib/sanitize";
import { htmlToText } from "@/lib/html";
import { computeSlaDueDates } from "@/lib/sla";
import { publishMessageCreated, publishTicketCreated } from "@/lib/realtime-publish";
import { enqueueAutomation } from "@/server/jobs/queues";
import { linkAttachmentsToMessage } from "@/server/services/attachment.service";
import type {
  PortalNewRequestInput,
  PortalReplyInput,
} from "@/lib/validators/portal";

const MAGIC_TTL_MS = 15 * 60 * 1000;

export type PortalContext = {
  workspaceId: string;
  customerId: string;
  slug: string;
};

async function loadWorkspaceBySlug(slug: string) {
  const workspace = await systemDb.orm.public.Workspace.where({ slug }).first();
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

export async function requestPortalMagicLink(slug: string, emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const workspace = await loadWorkspaceBySlug(slug);

  let customer = await systemDb.orm.public.Customer.where({
    workspaceId: workspace.id,
    email,
  }).first();
  if (!customer) {
    customer = await systemDb.orm.public.Customer.create({
      workspaceId: workspace.id,
      email,
      name: null,
    });
  }

  const { token, tokenHash } = generateToken();
  await systemDb.orm.public.CustomerMagicLink.create({
    workspaceId: workspace.id,
    email,
    tokenHash,
    expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
  });

  const content = magicLinkEmail({
    workspaceName: workspace.name,
    slug: workspace.slug,
    token,
  });
  await getEmailProvider().sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  return { ok: true as const, customerId: customer.id };
}

export async function consumePortalMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const row = await systemDb.orm.public.CustomerMagicLink.where({
    tokenHash,
  }).first();
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("This sign-in link is invalid or expired.");
  }

  const workspace = await systemDb.orm.public.Workspace.where({
    id: row.workspaceId,
  }).first();
  if (!workspace) throw new NotFoundError("Workspace not found");

  let customer = await systemDb.orm.public.Customer.where({
    workspaceId: workspace.id,
    email: row.email,
  }).first();
  if (!customer) {
    customer = await systemDb.orm.public.Customer.create({
      workspaceId: workspace.id,
      email: row.email,
      name: null,
    });
  }

  await systemDb.orm.public.CustomerMagicLink.where({ id: row.id }).update({
    usedAt: new Date(),
  });

  return {
    workspaceId: workspace.id,
    slug: workspace.slug,
    customerId: customer.id,
    workspaceName: workspace.name,
  };
}

export async function listPortalTickets(ctx: PortalContext) {
  return withTenantDb(ctx, async (tx) => {
    const tickets = await tx.orm.public.Ticket.where({
      workspaceId: ctx.workspaceId,
      customerId: ctx.customerId,
    }).all();
    return tickets
      .filter((row) => !row.mergedIntoTicketId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())
      .map((row) => ({
        id: row.id,
        number: row.number,
        subject: row.subject,
        status: row.status,
        priority: row.priority,
        lastMessageAt: row.lastMessageAt,
        createdAt: row.createdAt,
      }));
  });
}

export async function getPortalTicket(ctx: PortalContext, number: number) {
  return withTenantDb(ctx, async (tx) => {
    const ticket = await tx.orm.public.Ticket.where({
      workspaceId: ctx.workspaceId,
      number,
      customerId: ctx.customerId,
    }).first();
    if (!ticket || ticket.mergedIntoTicketId) {
      throw new NotFoundError("Ticket not found");
    }

    const messages = await tx.orm.public.Message.where({
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
    }).all();

    const publicMessages = messages
      .filter((m) => m.kind === "REPLY")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m) => ({
        id: m.id,
        authorType: m.authorType,
        bodyHtml: m.bodyHtml,
        bodyText: m.bodyText,
        createdAt: m.createdAt,
      }));

    return {
      ticket: {
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
      messages: publicMessages,
    };
  });
}

export async function addPortalReply(
  ctx: PortalContext,
  number: number,
  input: PortalReplyInput,
) {
  const { bodyHtml, bodyText } = sanitizeAndPlainText(input.bodyHtml);

  const { message, ticket } = await withTenantDb(ctx, async (tx) => {
    const ticket = await tx.orm.public.Ticket.where({
      workspaceId: ctx.workspaceId,
      number,
      customerId: ctx.customerId,
    }).first();
    if (!ticket || ticket.mergedIntoTicketId) {
      throw new NotFoundError("Ticket not found");
    }

    const created = await tx.orm.public.Message.create({
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
      authorType: "CUSTOMER",
      authorCustomerId: ctx.customerId,
      kind: "REPLY",
      bodyHtml,
      bodyText,
    });

    await tx.orm.public.Ticket.where({ id: ticket.id }).update({
      lastMessageAt: new Date(),
      lastCustomerMessageAt: new Date(),
      status: ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status,
    });

    return { message: created, ticket };
  });

  if (input.attachmentIds?.length) {
    await linkAttachmentsToMessage(
      { workspaceId: ctx.workspaceId },
      { messageId: message.id, attachmentIds: input.attachmentIds },
    );
  }

  await publishMessageCreated(
    { workspaceId: ctx.workspaceId, membershipId: null },
    {
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      message,
    },
  );
  await enqueueAutomation({
    workspaceId: ctx.workspaceId,
    ticketId: ticket.id,
    trigger: "message.created",
    origin: "user",
  });

  return message;
}

export async function createPortalRequest(
  ctx: PortalContext,
  input: PortalNewRequestInput,
) {
  const { bodyHtml, bodyText } = sanitizeAndPlainText(input.bodyHtml);
  const subject = input.subject.trim();

  const ticket = await withTenantDb(ctx, async (tx) => {
    const number = await allocateTicketNumber(tx, ctx.workspaceId);
    const now = new Date();
    const policy = await tx.orm.public.SlaPolicy.where({
      workspaceId: ctx.workspaceId,
      priority: "NORMAL",
      enabled: true,
    }).first();
    const dues = computeSlaDueDates(now, policy);

    const created = await tx.orm.public.Ticket.create({
      workspaceId: ctx.workspaceId,
      number,
      customerId: ctx.customerId,
      subject,
      status: "OPEN",
      priority: "NORMAL",
      channel: "PORTAL",
      lastMessageAt: now,
      lastCustomerMessageAt: now,
      slaFirstResponseDueAt: dues.slaFirstResponseDueAt,
      slaResolutionDueAt: dues.slaResolutionDueAt,
    });

    await tx.orm.public.Message.create({
      workspaceId: ctx.workspaceId,
      ticketId: created.id,
      authorType: "CUSTOMER",
      authorCustomerId: ctx.customerId,
      kind: "REPLY",
      bodyHtml,
      bodyText: bodyText || htmlToText(bodyHtml),
    });

    return created;
  });

  await publishTicketCreated(
    { workspaceId: ctx.workspaceId, membershipId: null },
    ticket,
  );
  await enqueueAutomation({
    workspaceId: ctx.workspaceId,
    ticketId: ticket.id,
    trigger: "ticket.created",
    origin: "user",
  });

  return ticket;
}

export async function assertPortalCustomer(
  slug: string,
  session: { workspaceId: string; customerId: string } | null,
): Promise<PortalContext> {
  if (!session) throw new ForbiddenError("Sign in required");
  const workspace = await loadWorkspaceBySlug(slug);
  if (workspace.id !== session.workspaceId) {
    throw new ForbiddenError("Wrong workspace");
  }
  const customer = await systemDb.orm.public.Customer.where({
    id: session.customerId,
    workspaceId: workspace.id,
  }).first();
  if (!customer) throw new ForbiddenError("Customer not found");
  return {
    workspaceId: workspace.id,
    customerId: customer.id,
    slug: workspace.slug,
  };
}
