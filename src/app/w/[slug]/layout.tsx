import { auth } from "@/server/auth/auth";
import { getTenantContext, listWorkspacesForUser } from "@/server/tenancy/context";
import { AppShell } from "@/components/layout/app-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  const session = await auth();
  const workspaces = await listWorkspacesForUser(ctx.userId);

  return (
    <AppShell
      slug={slug}
      workspaces={workspaces.map((row) => ({
        workspaceId: row.workspaceId,
        name: row.name,
        slug: row.slug,
        role: row.role,
      }))}
      user={{
        name: session?.user?.name ?? null,
        email: session?.user?.email ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
