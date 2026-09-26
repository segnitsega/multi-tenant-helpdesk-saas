import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

export const contract = contractFromJson<Contract>(contractJson);

export type AppDb = ReturnType<typeof createDb>;

export function createDb(url: string) {
  return postgres({
    contract,
    url,
  });
}

export const db = createDb(process.env["DATABASE_URL"]!);
