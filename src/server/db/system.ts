import "server-only";
import { createDb, type AppDb } from "../../../prisma/db";
import { env } from "@/server/env";

const globalForDb = globalThis as unknown as { systemDb?: AppDb };

/**
 * System DB client — connects as `system_user_role` (can bypass RLS).
 * Import only from auth, tenancy, jobs, webhooks, or tests.
 * Every query must still filter by workspaceId explicitly when touching tenant data.
 */
export const systemDb =
  globalForDb.systemDb ?? createDb(env.DATABASE_URL_SYSTEM);

if (env.NODE_ENV !== "production") {
  globalForDb.systemDb = systemDb;
}
