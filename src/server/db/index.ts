export { db } from "./client";
export { withTenantDb, type TenantCtx } from "./tenant";
export { allocateTicketNumber, createWorkspaceCounter } from "./ticket-number";
export type { DbTx } from "./types";
// systemDb is intentionally NOT re-exported — import from @/server/db/system only
// in allowed modules (see eslint no-restricted-imports).
