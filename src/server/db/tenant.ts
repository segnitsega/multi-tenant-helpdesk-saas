import "server-only";
import type { AppDb } from "../../../prisma/db";
import { db } from "./client";

export type TenantCtx = {
  workspaceId: string;
  userId?: string;
  role?: string;
};

type Tx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

/**
 * Run work inside a transaction with Postgres RLS scoped to this workspace.
 * `set_config(..., true)` is transaction-local — safe with Neon's pooled connections.
 */
export async function withTenantDb<T>(
  ctx: Pick<TenantCtx, "workspaceId">,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      tx.raw
        .sql`SELECT set_config('app.workspace_id', ${ctx.workspaceId}, true)`
        .affectedCount()
        .build(),
    );
    return fn(tx);
  });
}
