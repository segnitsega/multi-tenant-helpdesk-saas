import type { AppDb } from "../../../prisma/db";

export type DbTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];
