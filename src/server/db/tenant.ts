import "server-only";
import { db } from "./client";
import type { DbTx } from "./types";

export type TenantCtx = {
  workspaceId: string;
  userId?: string;
  role?: string;
};

export async function withTenantDb<T>(
  ctx: Pick<TenantCtx, "workspaceId">,
  fn: (tx: DbTx) => Promise<T>,
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
