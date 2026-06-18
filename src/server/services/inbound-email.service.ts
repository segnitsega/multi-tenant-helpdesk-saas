import "server-only";
import { systemDb } from "@/server/db/system";
import { enqueueEmailInbound } from "@/server/jobs/queues";
import { NotFoundError } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";

export async function getWorkspaceInboundAddress(
  ctx: Pick<TenantContext, "workspaceId">,
) {
  const workspace = await systemDb.orm.public.Workspace.where({
    id: ctx.workspaceId,
  }).first();
  return workspace?.inboundAddress ?? null;
}

export async function listRecentInboundEmails(
  ctx: Pick<TenantContext, "workspaceId">,
  limit = 25,
) {
  const rows = await systemDb.orm.public.InboundEmail.where({
    workspaceId: ctx.workspaceId,
  }).all();

  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((row) => {
      const payload = row.payload as { Subject?: string } | null;
      return {
        id: row.id,
        providerMessageId: row.providerMessageId,
        status: row.status,
        error: row.error,
        createdAt: row.createdAt.toISOString(),
        subject: payload?.Subject ?? null,
      };
    });
}

export async function hasReceivedInboundEmail(
  ctx: Pick<TenantContext, "workspaceId">,
) {
  const rows = await systemDb.orm.public.InboundEmail.where({
    workspaceId: ctx.workspaceId,
  }).all();
  return rows.some(
    (row) => row.status === "PROCESSED" || row.status === "RECEIVED",
  );
}

export async function replayInboundEmail(
  ctx: TenantContext,
  inboundEmailId: string,
) {
  const row = await systemDb.orm.public.InboundEmail.where({
    id: inboundEmailId,
  }).first();
  if (!row || (row.workspaceId && row.workspaceId !== ctx.workspaceId)) {
    throw new NotFoundError("Inbound email not found");
  }

  await systemDb.orm.public.InboundEmail.where({ id: row.id }).update({
    status: "RECEIVED",
    error: null,
    workspaceId: ctx.workspaceId,
  });

  await enqueueEmailInbound(
    row.id,
    `${row.providerMessageId}:replay:${Date.now()}`,
  );
  return { id: row.id };
}
