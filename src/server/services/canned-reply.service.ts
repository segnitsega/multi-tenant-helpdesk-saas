import "server-only";
import { withTenantDb } from "@/server/db";
import { NotFoundError } from "@/lib/api-error";
import {
  renderCannedBody,
  type CannedReplyVars,
} from "@/lib/canned-reply";
import type { TenantContext } from "@/types/tenant";

export async function listCannedReplies(
  ctx: Pick<TenantContext, "workspaceId">,
) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.CannedReply.where({
      workspaceId: ctx.workspaceId,
    }).all();
    return rows.sort((a, b) => a.title.localeCompare(b.title));
  });
}

export async function getCannedReply(
  ctx: Pick<TenantContext, "workspaceId">,
  id: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const row = await tx.orm.public.CannedReply.where({
      id,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!row) throw new NotFoundError("Canned reply not found");
    return row;
  });
}

export async function createCannedReply(
  ctx: Pick<TenantContext, "workspaceId">,
  input: { title: string; shortcut?: string | null; bodyHtml: string },
) {
  return withTenantDb(ctx, async (tx) => {
    return tx.orm.public.CannedReply.create({
      workspaceId: ctx.workspaceId,
      title: input.title.trim(),
      shortcut: input.shortcut?.trim() || null,
      bodyHtml: input.bodyHtml,
    });
  });
}

export async function updateCannedReply(
  ctx: Pick<TenantContext, "workspaceId">,
  id: string,
  input: { title?: string; shortcut?: string | null; bodyHtml?: string },
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.CannedReply.where({
      id,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!existing) throw new NotFoundError("Canned reply not found");

    const patch: {
      title?: string;
      shortcut?: string | null;
      bodyHtml?: string;
    } = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if ("shortcut" in input) patch.shortcut = input.shortcut?.trim() || null;
    if (input.bodyHtml !== undefined) patch.bodyHtml = input.bodyHtml;

    return tx.orm.public.CannedReply.where({ id }).update(patch);
  });
}

export async function deleteCannedReply(
  ctx: Pick<TenantContext, "workspaceId">,
  id: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.CannedReply.where({
      id,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!existing) throw new NotFoundError("Canned reply not found");
    await tx.orm.public.CannedReply.where({ id }).delete();
  });
}

export async function renderCannedReply(
  ctx: Pick<TenantContext, "workspaceId">,
  id: string,
  vars: CannedReplyVars,
) {
  const reply = await getCannedReply(ctx, id);
  return {
    ...reply,
    bodyHtml: renderCannedBody(reply.bodyHtml, vars),
  };
}

export { renderCannedBody };
