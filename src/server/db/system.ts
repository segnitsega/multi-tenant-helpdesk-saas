import "server-only";
import { createDb, type AppDb } from "../../../prisma/db";
import { env } from "@/server/env";

const globalForDb = globalThis as unknown as { systemDb?: AppDb };

export const systemDb =
  globalForDb.systemDb ?? createDb(env.DATABASE_URL_SYSTEM);

if (env.NODE_ENV !== "production") {
  globalForDb.systemDb = systemDb;
}
