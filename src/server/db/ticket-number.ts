import "server-only";
import type { DbTx } from "./types";

/**
 * Atomically allocate the next ticket number for a workspace.
 * Must run inside the same transaction that inserts the ticket
 * (and after `withTenantDb` has set `app.workspace_id`).
 *
 * Locks the counter row (`FOR UPDATE`) so concurrent creates never share a number.
 */
export async function allocateTicketNumber(
  tx: DbTx,
  workspaceId: string,
): Promise<number> {
  const counter = await tx.orm.public.WorkspaceCounter.where({
    workspaceId,
  })
    .forUpdate()
    .first();

  if (!counter) {
    throw new Error(
      `workspace_counters row missing for workspace ${workspaceId}. Create it when the workspace is created.`,
    );
  }

  const next = counter.ticketSeq + 1;

  await tx.orm.public.WorkspaceCounter.where({ workspaceId }).update({
    ticketSeq: next,
  });

  return next;
}

/**
 * Seed the per-workspace ticket sequence (call when creating a workspace).
 */
export async function createWorkspaceCounter(
  tx: DbTx,
  workspaceId: string,
): Promise<void> {
  await tx.orm.public.WorkspaceCounter.create({
    workspaceId,
    ticketSeq: 0,
  });
}
