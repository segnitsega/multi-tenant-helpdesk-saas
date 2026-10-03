import "server-only";
import type { Permission } from "@/config/permissions";
import { can } from "@/config/can";
import { ForbiddenError } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";

export { can };

export function assertCan(
  ctx: Pick<TenantContext, "role" | "readonly">,
  permission: Permission,
): void {
  if (!can(ctx.role, permission, ctx.readonly)) {
    throw new ForbiddenError();
  }
}
