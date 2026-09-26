import "server-only";
import { createDb, type AppDb } from "../../../prisma/db";
import { env } from "@/server/env";

const globalForDb = globalThis as unknown as { appDb?: AppDb };

export const db = globalForDb.appDb ?? createDb(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForDb.appDb = db;
}
