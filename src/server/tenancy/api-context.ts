import "server-only";
import { auth } from "@/server/auth/auth";
import { systemDb } from "@/server/db/system";
import { ForbiddenError } from "@/lib/api-error";
import type { Role } from "@/config/permissions";
import type { TenantContext } from "@/types/tenant";

export async function requireApiTenant(slug: string): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ForbiddenError("Unauthorized");
  }

  const workspace = await systemDb.orm.public.Workspace.where({ slug }).first();
  if (!workspace) throw new ForbiddenError("Workspace not found");

  const membership = await systemDb.orm.public.Membership.where({
    workspaceId: workspace.id,
    userId: session.user.id,
  }).first();
  if (!membership) throw new ForbiddenError("Forbidden");

  return {
    userId: session.user.id,
    workspaceId: workspace.id,
    membershipId: membership.id,
    role: membership.role as Role,
    readonly: membership.readonly,
    slug: workspace.slug,
  };
}
