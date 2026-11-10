import "server-only";
import { systemDb } from "@/server/db/system";
import { allocateTicketNumber, withTenantDb } from "@/server/db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api-error";
import { PlanLimitError } from "@/lib/api-error";
import { assertWithinPlan } from "@/server/services/billing.service";
import { sanitizeAndPlainText } from "@/lib/sanitize";
import { htmlToText } from "@/lib/html";
import { computeSlaDueDates } from "@/lib/sla";
import {
  publishMessageCreated,
  publishTicketCreated,
} from "@/lib/realtime-publish";
import { enqueueAutomation } from "@/server/jobs/queues";
import { checkRateLimit } from "@/server/rate-limit";
import type {
  UpdateWidgetSettingsInput,
  WidgetPrechatInput,
  WidgetReplyInput,
} from "@/lib/validators/widget";

const DEFAULT_SETTINGS = {
  color: "#2563eb",
  greeting: "Hi! How can we help?",
  allowedOrigins: [] as string[],
  showPoweredBy: true,
};

function parseOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function getWorkspaceByWidgetKey(widgetKey: string) {
  const workspace = await systemDb.orm.public.Workspace.where({
    widgetKey,
  }).first();
  if (!workspace) throw new NotFoundError("Widget not found");
  return workspace;
}

export async function getWidgetSettings(workspaceId: string) {
  const existing = await systemDb.orm.public.WidgetSettings.where({
    workspaceId,
  }).first();
  if (!existing) {
    return { workspaceId, ...DEFAULT_SETTINGS };
  }
  return {
    workspaceId,
    color: existing.color,
    greeting: existing.greeting,
    allowedOrigins: parseOrigins(existing.allowedOrigins),
    showPoweredBy: existing.showPoweredBy,
  };
}

export async function upsertWidgetSettings(
  ctx: { workspaceId: string },
  input: UpdateWidgetSettingsInput,
) {
  await assertWithinPlan(ctx, "enable_widget");

  const existing = await systemDb.orm.public.WidgetSettings.where({
    workspaceId: ctx.workspaceId,
  }).first();

  const payload = {
    color: input.color,
    greeting: input.greeting.trim(),
    allowedOrigins: input.allowedOrigins,
    showPoweredBy: input.showPoweredBy,
  };

  if (existing) {
    return systemDb.orm.public.WidgetSettings.where({
      workspaceId: ctx.workspaceId,
    }).update(payload);
  }

  return systemDb.orm.public.WidgetSettings.create({
    workspaceId: ctx.workspaceId,
    ...payload,
  });
}

export function assertOriginAllowed(
  allowedOrigins: string[],
  origin: string | null,
) {
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) return;
  if (!origin) throw new ForbiddenError("Origin required");
  if (!allowedOrigins.includes(origin)) {
    throw new ForbiddenError("Origin not allowed");
  }
}

export async function assertWidgetPublicAccess(input: {
  widgetKey: string;
  origin: string | null;
  ip: string;
}) {
  const workspace = await getWorkspaceByWidgetKey(input.widgetKey);
  try {
    await assertWithinPlan({ workspaceId: workspace.id }, "enable_widget");
  } catch (error) {
    if (error instanceof PlanLimitError) {
      throw new ForbiddenError("Widget is not available on this plan");
    }
    throw error;
  }

  const settings = await getWidgetSettings(workspace.id);
  assertOriginAllowed(settings.allowedOrigins, input.origin);
  await checkRateLimit(`widget:${input.widgetKey}:${input.ip}`, 60, 60);
  await checkRateLimit(`widget-key:${input.widgetKey}`, 300, 60);
  return { workspace, settings };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function startWidgetConversation(input: {
  widgetKey: string;
  origin: string | null;
  ip: string;
  data: WidgetPrechatInput;
}) {
  if (input.data.honeypot) throw new BadRequestError("Rejected");
  const { workspace } = await assertWidgetPublicAccess(input);
  const email = input.data.email.trim().toLowerCase();
  const name = input.data.name.trim();
  const text = input.data.message.trim();
  const bodyHtml = `<p>${escapeHtml(text)}</p>`;
  const { bodyText } = sanitizeAndPlainText(bodyHtml);

  const result = await withTenantDb(
    { workspaceId: workspace.id },
    async (tx) => {
      let customer = await tx.orm.public.Customer.where({
        workspaceId: workspace.id,
        email,
      }).first();
      if (!customer) {
        customer = await tx.orm.public.Customer.create({
          workspaceId: workspace.id,
          email,
          name,
        });
      } else if (!customer.name) {
        customer = await tx.orm.public.Customer.where({ id: customer.id }).update({
          name,
        });
      }

      const number = await allocateTicketNumber(tx, workspace.id);
      const now = new Date();
      const policy = await tx.orm.public.SlaPolicy.where({
        workspaceId: workspace.id,
        priority: "NORMAL",
        enabled: true,
      }).first();
      const dues = computeSlaDueDates(now, policy);

      const ticket = await tx.orm.public.Ticket.create({
        workspaceId: workspace.id,
        number,
        customerId: customer!.id,
        subject: text.slice(0, 80) || "Widget conversation",
        status: "OPEN",
        priority: "NORMAL",
        channel: "WIDGET",
        lastMessageAt: now,
        lastCustomerMessageAt: now,
        slaFirstResponseDueAt: dues.slaFirstResponseDueAt,
        slaResolutionDueAt: dues.slaResolutionDueAt,
      });

      const message = await tx.orm.public.Message.create({
        workspaceId: workspace.id,
        ticketId: ticket.id,
        authorType: "CUSTOMER",
        authorCustomerId: customer!.id,
        kind: "REPLY",
        bodyHtml,
        bodyText: bodyText || htmlToText(bodyHtml),
      });

      return { ticket, message, customerId: customer!.id };
    },
  );

  await publishTicketCreated(
    { workspaceId: workspace.id, membershipId: null },
    result.ticket,
  );
  await enqueueAutomation({
    workspaceId: workspace.id,
    ticketId: result.ticket.id,
    trigger: "ticket.created",
    origin: "user",
  });

  return {
    workspaceId: workspace.id,
    customerId: result.customerId,
    ticketNumber: result.ticket.number,
    ticketId: result.ticket.id,
    message: result.message,
  };
}

export async function addWidgetReply(input: {
  widgetKey: string;
  origin: string | null;
  ip: string;
  customerId: string;
  data: WidgetReplyInput;
}) {
  if (input.data.honeypot) throw new BadRequestError("Rejected");
  const { workspace } = await assertWidgetPublicAccess(input);
  const text = input.data.message.trim();
  const bodyHtml = `<p>${escapeHtml(text)}</p>`;
  const { bodyText } = sanitizeAndPlainText(bodyHtml);

  const { message, ticket } = await withTenantDb(
    { workspaceId: workspace.id },
    async (tx) => {
      const ticket = await tx.orm.public.Ticket.where({
        workspaceId: workspace.id,
        number: input.data.ticketNumber,
        customerId: input.customerId,
      }).first();
      if (!ticket || ticket.channel !== "WIDGET") {
        throw new NotFoundError("Conversation not found");
      }

      const created = await tx.orm.public.Message.create({
        workspaceId: workspace.id,
        ticketId: ticket.id,
        authorType: "CUSTOMER",
        authorCustomerId: input.customerId,
        kind: "REPLY",
        bodyHtml,
        bodyText: bodyText || htmlToText(bodyHtml),
      });

      await tx.orm.public.Ticket.where({ id: ticket.id }).update({
        lastMessageAt: new Date(),
        lastCustomerMessageAt: new Date(),
      });

      return { message: created, ticket };
    },
  );

  await publishMessageCreated(
    { workspaceId: workspace.id, membershipId: null },
    {
      ticketId: ticket.id,
      ticketNumber: ticket.number,
      message,
    },
  );
  await enqueueAutomation({
    workspaceId: workspace.id,
    ticketId: ticket.id,
    trigger: "message.created",
    origin: "user",
  });

  return message;
}

export async function listWidgetMessages(input: {
  widgetKey: string;
  customerId: string;
  ticketNumber: number;
}) {
  const workspace = await getWorkspaceByWidgetKey(input.widgetKey);
  return withTenantDb({ workspaceId: workspace.id }, async (tx) => {
    const ticket = await tx.orm.public.Ticket.where({
      workspaceId: workspace.id,
      number: input.ticketNumber,
      customerId: input.customerId,
    }).first();
    if (!ticket) throw new NotFoundError("Conversation not found");

    const messages = await tx.orm.public.Message.where({
      workspaceId: workspace.id,
      ticketId: ticket.id,
    }).all();

    return messages
      .filter((m) => m.kind === "REPLY")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((m) => ({
        id: m.id,
        authorType: m.authorType,
        bodyText: m.bodyText,
        bodyHtml: m.bodyHtml,
        createdAt: m.createdAt.toISOString(),
      }));
  });
}
