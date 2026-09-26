import "server-only";
import type { DbTx } from "./types";

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

export async function createWorkspaceCounter(
  tx: DbTx,
  workspaceId: string,
): Promise<void> {
  await tx.orm.public.WorkspaceCounter.create({
    workspaceId,
    ticketSeq: 0,
  });
}
