import "server-only";
import { randomUUID } from "node:crypto";
import { UnrecoverableError } from "bullmq";
import { systemDb } from "@/server/db/system";
import { allocateTicketNumber, withTenantDb } from "@/server/db";
import { parsePostmarkInbound } from "@/server/email/inbound/parse";
import {
  assertInboundSenderRateLimit,
  shouldIgnoreInbound,
} from "@/server/email/inbound/guards";
import { matchInboundThread } from "@/server/email/inbound/match-thread";
import { sanitizeAndPlainText } from "@/lib/sanitize";
import { extractEmailAddress, normalizeMessageId } from "@/lib/email-address";
import { putObject } from "@/server/storage/s3";
import {
  isAllowedUploadMimeType,
  isAllowedUploadSize,
} from "@/config/uploads";
import type { EmailInboundJob } from "@/server/jobs/queues";
import {
  publishMessageCreated,
  publishTicketCreated,
  publishTicketUpdated,
} from "@/lib/realtime-publish";

function visibleBody(email: ReturnType<typeof parsePostmarkInbound>) {
  if (email.strippedReply) {
    const text = email.strippedReply;
    return sanitizeAndPlainText(`<p>${escapeHtml(text).replaceAll("\n", "<br/>")}</p>`);
  }
  if (email.htmlBody.trim()) {
    return sanitizeAndPlainText(email.htmlBody);
  }
  const text = email.textBody || "(empty message)";
  return sanitizeAndPlainText(
    `<p>${escapeHtml(text).replaceAll("\n", "<br/>")}</p>`,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function processEmailInbound(job: EmailInboundJob) {
  const inbound = await systemDb.orm.public.InboundEmail.where({
    id: job.inboundEmailId,
  }).first();
  if (!inbound) {
    throw new UnrecoverableError(`Inbound email ${job.inboundEmailId} missing`);
  }
  if (inbound.status === "PROCESSED") {
    return { skipped: true as const };
  }

  try {
    const email = parsePostmarkInbound(inbound.payload);
    const guard = shouldIgnoreInbound(email);
    if (!guard.ok) {
      await systemDb.orm.public.InboundEmail.where({ id: inbound.id }).update({
        status: "PROCESSED",
        error: `Ignored: ${guard.reason}`,
      });
      return { ignored: true as const, reason: guard.reason };
    }

    await assertInboundSenderRateLimit(email.from);

    const toEmail = extractEmailAddress(email.to);
    const [local = "", domain = ""] = toEmail.split("@");
    const baseLocal = local.split("+")[0] ?? local;
    const baseAddress = `${baseLocal}@${domain}`;
    const workspace =
      (await systemDb.orm.public.Workspace.where({
        inboundAddress: baseAddress,
      }).first()) ??
      (await systemDb.orm.public.Workspace.where({
        inboundAddress: toEmail,
      }).first()) ??
      (await systemDb.orm.public.Workspace.where({ slug: baseLocal }).first());

    if (!workspace) {
      throw new UnrecoverableError(`No workspace for recipient ${email.to}`);
    }

    await systemDb.orm.public.InboundEmail.where({ id: inbound.id }).update({
      workspaceId: workspace.id,
    });

    const workspaceId = workspace.id;
    const customerEmail = extractEmailAddress(email.from);
    const { bodyHtml, bodyText } = visibleBody(email);
    const emailMessageId = normalizeMessageId(email.messageId);

    const result = await withTenantDb({ workspaceId }, async (tx) => {
      let customer = await tx.orm.public.Customer.where({
        workspaceId,
        email: customerEmail,
      }).first();
      if (!customer) {
        customer = await tx.orm.public.Customer.create({
          workspaceId,
          email: customerEmail,
          name: email.fromName,
        });
      } else if (email.fromName && !customer.name) {
        customer = await tx.orm.public.Customer.where({
          id: customer.id,
        }).update({ name: email.fromName });
      }
      if (!customer) throw new Error("Customer upsert failed");

      const tickets = await tx.orm.public.Ticket.where({ workspaceId }).all();
      const messages = await tx.orm.public.Message.where({ workspaceId }).all();

      const ticketsByNumber = new Map(
        tickets.map((ticket) => [ticket.number, ticket]),
      );
      const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
      const messagesByEmailId = new Map<
        string,
        { ticketId: string; emailMessageId: string | null }
      >();
      for (const message of messages) {
        if (!message.emailMessageId) continue;
        messagesByEmailId.set(message.emailMessageId, message);
        const normalized = normalizeMessageId(message.emailMessageId);
        if (normalized) messagesByEmailId.set(normalized, message);
      }

      const match = matchInboundThread({
        mailboxHash: email.mailboxHash,
        inReplyTo: email.inReplyTo,
        references: email.references,
        ticketsByNumber,
        ticketsById,
        messagesByEmailId,
      });

      const now = new Date();
      let ticket =
        match.type === "existing"
          ? ticketsById.get(match.ticket.id) ?? null
          : null;
      let createdTicket = false;
      let reopenPatch: Record<string, unknown> | null = null;

      if (!ticket) {
        const number = await allocateTicketNumber(tx, workspaceId);
        ticket = await tx.orm.public.Ticket.create({
          workspaceId,
          number,
          customerId: customer.id,
          subject: email.subject,
          channel: "EMAIL",
          status: "OPEN",
          lastMessageAt: now,
          lastCustomerMessageAt: now,
        });
        createdTicket = true;
      } else {
        const patch: {
          lastMessageAt: Date;
          lastCustomerMessageAt: Date;
          status?: "OPEN";
          closedAt?: null;
          resolvedAt?: null;
        } = {
          lastMessageAt: now,
          lastCustomerMessageAt: now,
        };
        if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
          patch.status = "OPEN";
          patch.closedAt = null;
          patch.resolvedAt = null;
          reopenPatch = { status: "OPEN", closedAt: null, resolvedAt: null };
        }
        ticket = await tx.orm.public.Ticket.where({ id: ticket.id }).update(
          patch,
        );
      }
      if (!ticket) throw new Error("Ticket upsert failed");

      if (emailMessageId) {
        const duplicate = await tx.orm.public.Message.where({
          workspaceId,
          emailMessageId,
        }).first();
        if (duplicate) {
          return {
            ticketId: ticket.id,
            ticketNumber: ticket.number,
            messageId: duplicate.id,
            duplicate: true as const,
          };
        }
      }

      const createdMessage = await tx.orm.public.Message.create({
        workspaceId,
        ticketId: ticket.id,
        authorType: "CUSTOMER",
        authorCustomerId: customer.id,
        kind: "REPLY",
        bodyHtml,
        bodyText,
        emailMessageId,
        inReplyTo: normalizeMessageId(email.inReplyTo),
        deliveryStatus: null,
      });

      for (const attachment of email.attachments) {
        if (!attachment.contentBase64) continue;
        if (!isAllowedUploadMimeType(attachment.contentType)) continue;
        const buffer = Buffer.from(attachment.contentBase64, "base64");
        if (!isAllowedUploadSize(buffer.byteLength)) continue;

        const attachmentId = randomUUID();
        const storageKey = `${workspaceId}/${ticket.id}/${attachmentId}/${attachment.filename}`;
        await putObject(storageKey, buffer, attachment.contentType);
        await tx.orm.public.Attachment.create({
          id: attachmentId,
          workspaceId,
          ticketId: ticket.id,
          messageId: createdMessage.id,
          storageKey,
          filename: attachment.filename,
          sizeBytes: buffer.byteLength,
          mimeType: attachment.contentType,
          status: "READY",
        });
      }

      return {
        ticketId: ticket.id,
        ticketNumber: ticket.number,
        ticketSubject: ticket.subject,
        ticketStatus: ticket.status,
        ticketPriority: ticket.priority,
        message: createdMessage,
        createdTicket,
        reopenPatch,
        duplicate: false as const,
      };
    });

    await systemDb.orm.public.InboundEmail.where({ id: inbound.id }).update({
      status: "PROCESSED",
      error: null,
      workspaceId: workspace.id,
    });

    if (!("duplicate" in result) || !result.duplicate) {
      const publishCtx = { workspaceId: workspace.id, membershipId: null };
      if ("createdTicket" in result && result.createdTicket) {
        await publishTicketCreated(publishCtx, {
          id: result.ticketId,
          number: result.ticketNumber,
          subject: result.ticketSubject,
          status: result.ticketStatus,
          priority: result.ticketPriority,
        });
      } else if ("reopenPatch" in result && result.reopenPatch) {
        await publishTicketUpdated(
          publishCtx,
          { id: result.ticketId, number: result.ticketNumber },
          result.reopenPatch,
        );
      }
      if ("message" in result && result.message) {
        await publishMessageCreated(publishCtx, {
          ticketId: result.ticketId,
          ticketNumber: result.ticketNumber,
          message: result.message,
        });
      }
    }

    return result;
  } catch (error) {
    await systemDb.orm.public.InboundEmail.where({ id: inbound.id }).update({
      status: "FAILED",
      error: error instanceof Error ? error.message : "Inbound processing failed",
    });
    throw error;
  }
}
