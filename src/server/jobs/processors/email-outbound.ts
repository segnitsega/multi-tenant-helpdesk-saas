import "server-only";
import { UnrecoverableError } from "bullmq";
import { systemDb } from "@/server/db/system";
import { withTenantDb } from "@/server/db";
import { getEmailProvider } from "@/server/email";
import { env } from "@/server/env";
import {
  emailMuted,
  renderEmailLayout,
} from "@/server/email/templates/layout";
import {
  buildReplyToAddress,
  buildSupportFromAddress,
  normalizeMessageId,
} from "@/lib/email-address";
import type { EmailOutboundJob } from "@/server/jobs/queues";

export async function processEmailOutbound(
  job: EmailOutboundJob,
  meta: { attemptsMade: number; maxAttempts: number },
) {
  const { workspaceId, messageId } = job;

  const message = await withTenantDb({ workspaceId }, async (tx) =>
    tx.orm.public.Message.where({ id: messageId, workspaceId }).first(),
  );

  if (!message) {
    throw new UnrecoverableError(`Message ${messageId} not found`);
  }
  if (message.kind !== "REPLY" || message.authorType !== "AGENT") {
    throw new UnrecoverableError("Only agent replies are sent outbound");
  }
  if (message.deliveryStatus === "SENT") {
    return { skipped: true as const };
  }

  const workspace = await systemDb.orm.public.Workspace.where({
    id: workspaceId,
  }).first();
  if (!workspace) {
    throw new UnrecoverableError(`Workspace ${workspaceId} not found`);
  }

  const ticket = await withTenantDb({ workspaceId }, async (tx) =>
    tx.orm.public.Ticket.where({ id: message.ticketId, workspaceId }).first(),
  );
  if (!ticket) {
    throw new UnrecoverableError("Ticket not found for outbound message");
  }

  const customer = await withTenantDb({ workspaceId }, async (tx) =>
    tx.orm.public.Customer.where({
      id: ticket.customerId,
      workspaceId,
    }).first(),
  );
  if (!customer?.email) {
    throw new UnrecoverableError("Customer email missing");
  }

  const prior = await withTenantDb({ workspaceId }, async (tx) => {
    const rows = await tx.orm.public.Message.where({
      workspaceId,
      ticketId: ticket.id,
    }).all();
    return rows
      .filter((row) => row.emailMessageId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  });

  const lastInbound = [...prior]
    .reverse()
    .find((row) => row.authorType === "CUSTOMER" && row.emailMessageId);
  const referenceIds = prior
    .map((row) => normalizeMessageId(row.emailMessageId))
    .filter((value): value is string => Boolean(value));

  const outboundMessageId =
    normalizeMessageId(message.emailMessageId) ??
    normalizeMessageId(`relay.${message.id}@${env.MAIL_DOMAIN}`)!;

  const headers: Record<string, string> = {
    "Message-ID": outboundMessageId,
  };
  if (lastInbound?.emailMessageId) {
    headers["In-Reply-To"] = normalizeMessageId(lastInbound.emailMessageId)!;
  }
  if (referenceIds.length > 0) {
    headers.References = referenceIds.join(" ");
  }

  const html = renderEmailLayout({
    title: ticket.subject,
    preheader: message.bodyText.slice(0, 120),
    workspaceName: workspace.name,
    bodyHtml: [
      `<div style="margin:0 0 16px;">${message.bodyHtml}</div>`,
      emailMuted(
        `Ticket #${ticket.number} · Reply to this email to continue the conversation.`,
      ),
    ].join(""),
    footerNote: `${workspace.name} sent this reply through Relay.`,
  });

  try {
    const provider = getEmailProvider();
    const result = await provider.sendEmail({
      to: customer.email,
      subject: ticket.subject.startsWith("Re:")
        ? ticket.subject
        : `Re: ${ticket.subject}`,
      html,
      text: message.bodyText,
      from: buildSupportFromAddress(
        env.MAIL_FROM_NAME,
        workspace.slug,
        env.MAIL_DOMAIN,
      ),
      replyTo: buildReplyToAddress(
        workspace.slug,
        ticket.number,
        env.MAIL_DOMAIN,
      ),
      headers,
      messageId: outboundMessageId,
    });

    await withTenantDb({ workspaceId }, async (tx) => {
      await tx.orm.public.Message.where({ id: message.id }).update({
        deliveryStatus: "SENT",
        emailMessageId: result.messageId,
        inReplyTo: headers["In-Reply-To"] ?? null,
      });
    });

    return { sent: true as const, messageId: result.messageId };
  } catch (error) {
    if (meta.attemptsMade + 1 >= meta.maxAttempts) {
      await withTenantDb({ workspaceId }, async (tx) => {
        await tx.orm.public.Message.where({ id: message.id }).update({
          deliveryStatus: "FAILED",
        });
      });
    }
    throw error;
  }
}
