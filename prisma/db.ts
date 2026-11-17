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

function parseGetentIpv4(output: string): string | null {
  return (
    output
      .split("\n")
      .map((line) => line.trim().split(/\s+/)[0])
      .find((value) => Boolean(value)) ?? null
  );
}

function resolveIpv4WithGetent(hostname: string): string | null {
  try {
    const out = execFileSync("getent", ["ahostsv4", hostname], {
      encoding: "utf8",
      timeout: 5_000,
    });
    return parseGetentIpv4(out);
  } catch {
    return null;
  }
}

function resolveIpv4WithNode(hostname: string): string | null {
  try {
    const script = `
      require("dns").lookup(${JSON.stringify(hostname)}, { family: 4 }, (err, address) => {
        if (err || !address) process.exit(1);
        process.stdout.write(address);
      });
    `;
    const out = execFileSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      timeout: 8_000,
    });
    const address = out.trim();
    return address || null;
  } catch {
    return null;
  }
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function resolveIpv4(hostname: string): string {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const fromGetent = resolveIpv4WithGetent(hostname);
    if (fromGetent) return fromGetent;

    const fromNode = resolveIpv4WithNode(hostname);
    if (fromNode) return fromNode;

    if (attempt < 3) sleepSync(250 * attempt);
  }

  throw new Error(
    `Could not resolve IPv4 for ${hostname}. Check network/DNS, then retry.`,
  );
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
