import "server-only";
import { randomUUID } from "node:crypto";
import { withTenantDb } from "@/server/db";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/api-error";
import {
  createDownloadUrl,
  createUploadUrl,
  headObject,
} from "@/server/storage/s3";
import {
  isAllowedUploadMimeType,
  isAllowedUploadSize,
} from "@/config/uploads";
import type { TenantContext } from "@/types/tenant";

export async function createPendingAttachment(
  ctx: TenantContext,
  input: {
    ticketNumber: number;
    filename: string;
    contentType: string;
    sizeBytes: number;
  },
) {
  if (!isAllowedUploadMimeType(input.contentType)) {
    throw new BadRequestError("File type is not allowed.");
  }
  if (!isAllowedUploadSize(input.sizeBytes)) {
    throw new BadRequestError("File is too large (max 10 MB).");
  }

  return withTenantDb(ctx, async (tx) => {
    const ticket = await tx.orm.public.Ticket.where({
      workspaceId: ctx.workspaceId,
      number: input.ticketNumber,
    }).first();
    if (!ticket) throw new NotFoundError("Ticket not found");

    const attachmentId = randomUUID();
    const storageKey = `${ctx.workspaceId}/${ticket.id}/${attachmentId}/${input.filename}`;

    const attachment = await tx.orm.public.Attachment.create({
      id: attachmentId,
      workspaceId: ctx.workspaceId,
      ticketId: ticket.id,
      storageKey,
      filename: input.filename,
      sizeBytes: input.sizeBytes,
      mimeType: input.contentType,
      status: "PENDING",
    });

    const uploadUrl = await createUploadUrl(
      storageKey,
      input.contentType,
      input.sizeBytes,
    );

    return { attachment, uploadUrl };
  });
}

export async function confirmAttachment(
  ctx: TenantContext,
  attachmentId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const attachment = await tx.orm.public.Attachment.where({
      id: attachmentId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!attachment) throw new NotFoundError("Attachment not found");
    if (attachment.status === "READY") return attachment;

    const head = await headObject(attachment.storageKey);
    if (!head) {
      throw new BadRequestError("Upload not found in storage yet.");
    }
    if (
      typeof head.contentLength === "number" &&
      head.contentLength !== attachment.sizeBytes
    ) {
      throw new BadRequestError("Uploaded file size does not match.");
    }

    return tx.orm.public.Attachment.where({ id: attachment.id }).update({
      status: "READY",
    });
  });
}

export async function listTicketAttachments(
  ctx: Pick<TenantContext, "workspaceId">,
  ticketId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.Attachment.where({
      workspaceId: ctx.workspaceId,
      ticketId,
    }).all();
    return rows.filter((row) => row.status === "READY");
  });
}

export async function getAttachmentDownloadUrl(
  ctx: TenantContext,
  attachmentId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const attachment = await tx.orm.public.Attachment.where({
      id: attachmentId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!attachment) throw new NotFoundError("Attachment not found");
    if (attachment.status !== "READY") {
      throw new BadRequestError("Attachment is not ready.");
    }
    const url = await createDownloadUrl(attachment.storageKey);
    return { url, filename: attachment.filename, mimeType: attachment.mimeType };
  });
}

export async function assertAttachmentTenantAccess(
  workspaceId: string,
  attachmentId: string,
) {
  return withTenantDb({ workspaceId }, async (tx) => {
    const attachment = await tx.orm.public.Attachment.where({
      id: attachmentId,
      workspaceId,
    }).first();
    if (!attachment) throw new ForbiddenError("Attachment not found");
    return attachment;
  });
}

export async function linkAttachmentsToMessage(
  ctx: Pick<TenantContext, "workspaceId">,
  input: { messageId: string; attachmentIds: string[] },
) {
  if (input.attachmentIds.length === 0) return;
  return withTenantDb(ctx, async (tx) => {
    for (const attachmentId of input.attachmentIds) {
      const attachment = await tx.orm.public.Attachment.where({
        id: attachmentId,
        workspaceId: ctx.workspaceId,
      }).first();
      if (!attachment || attachment.status !== "READY") {
        throw new BadRequestError("One or more attachments are not ready.");
      }
      await tx.orm.public.Attachment.where({ id: attachmentId }).update({
        messageId: input.messageId,
      });
    }
  });
}
