import "server-only";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { systemDb } from "@/server/db/system";
import type { Role } from "@/config/permissions";
import type { TenantContext } from "@/types/tenant";

export async function getTenantContext(slug: string): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspace = await systemDb.orm.public.Workspace.where({ slug }).first();
  if (!workspace) notFound();

  const membership = await systemDb.orm.public.Membership.where({
    workspaceId: workspace.id,
    userId: session.user.id,
  }).first();
  if (!membership) notFound();

  return {
    userId: session.user.id,
    workspaceId: workspace.id,
    membershipId: membership.id,
    role: membership.role as Role,
    readonly: membership.readonly,
    slug: workspace.slug,
  };
}

export async function listWorkspacesForUser(userId: string) {
  const memberships = await systemDb.orm.public.Membership.where({
    userId,
  }).all();
  if (memberships.length === 0) return [];

  const workspaces = await Promise.all(
    memberships.map((m) =>
      systemDb.orm.public.Workspace.where({ id: m.workspaceId }).first(),
    ),
  );

  return memberships
    .map((m, i) => {
      const workspace = workspaces[i];
      if (!workspace) return null;
      return {
        membershipId: m.id,
        role: m.role as Role,
        readonly: m.readonly,
        workspaceId: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}
