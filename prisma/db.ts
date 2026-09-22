import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const contract = contractFromJson<Contract>(contractJson);

export type AppDb = ReturnType<typeof createDb>;

/** Create a typed Postgres client bound to a connection URL. */
export function createDb(url: string) {
  return postgres({
    contract,
    url,
  });
}

/** Default CLI / script client (uses DATABASE_URL). Prefer src/server/db in the app. */
export const db = createDb(process.env["DATABASE_URL"]!);
