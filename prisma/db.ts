import "dotenv/config";
import { execFileSync } from "node:child_process";
import { setDefaultResultOrder } from "node:dns";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import { Pool } from "pg";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

setDefaultResultOrder("ipv4first");

export const contract = contractFromJson<Contract>(contractJson);

export type AppDb = ReturnType<typeof createDb>;

function resolveIpv4(hostname: string): string {
  const out = execFileSync("getent", ["ahostsv4", hostname], {
    encoding: "utf8",
  });
  const address = out
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .find((value) => Boolean(value));
  if (!address) {
    throw new Error(`No IPv4 address found for ${hostname}`);
  }
  return address;
}

function createIpv4Pool(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const address = resolveIpv4(hostname);

  return new Pool({
    host: address,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl: { rejectUnauthorized: true, servername: hostname },
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });
}

export function createDb(url: string) {
  const pool = createIpv4Pool(url);
  const client = postgres({
    contract,
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
