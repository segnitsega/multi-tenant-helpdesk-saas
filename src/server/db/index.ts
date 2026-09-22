export { db } from "./client";
export { withTenantDb, type TenantCtx } from "./tenant";
// systemDb is intentionally NOT re-exported — import from @/server/db/system only
// in allowed modules (see eslint no-restricted-imports).
