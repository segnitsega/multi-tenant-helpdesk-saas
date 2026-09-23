import type { AppDb } from "../../../prisma/db";

/** Transaction client passed into `withTenantDb` / system transactions. */
export type DbTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
