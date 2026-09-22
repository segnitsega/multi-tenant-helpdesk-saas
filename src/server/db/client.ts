import "server-only";
import { createDb, type AppDb } from "../../../prisma/db";
import { env } from "@/server/env";

const globalForDb = globalThis as unknown as { appDb?: AppDb };

/**
 * App DB client — connects as `app_user` (RLS applies).
 * Always query tenant data through `withTenantDb` so `app.workspace_id` is set.
 */
export const db = globalForDb.appDb ?? createDb(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForDb.appDb = db;
}
