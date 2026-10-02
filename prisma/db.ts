import "dotenv/config";
import { setDefaultResultOrder } from "node:dns";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import { Pool } from "pg";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

setDefaultResultOrder("ipv4first");

export const contract = contractFromJson<Contract>(contractJson);

export type AppDb = ReturnType<typeof createDb>;

export function createDb(url: string) {
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });

  const client = postgres({
    contract,
    // BYO pool so Prisma applies session settings via SET (Neon rejects lc_* startup options).
    // Cast: duplicate @types/pg versions between app and Prisma.
    pg: pool as never,
  });

  const originalClose = client.close.bind(client);
  client.close = async () => {
    await originalClose();
    await pool.end();
  };

  return client;
}

export const db = createDb(process.env["DATABASE_URL"]!);
