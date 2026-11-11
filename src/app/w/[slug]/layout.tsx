import { auth } from "@/server/auth/auth";
import { getTenantContext, listWorkspacesForUser } from "@/server/tenancy/context";
import { AppShell } from "@/components/layout/app-shell";
import { RealtimeProvider } from "@/features/realtime/realtime-provider";

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
  const agentName =
    session?.user?.name?.trim() || session?.user?.email || "Agent";

  return (
    <RealtimeProvider
      slug={slug}
      workspaceId={ctx.workspaceId}
      membershipId={ctx.membershipId}
      agentName={agentName}
    >
      <AppShell
        slug={slug}
        membershipId={ctx.membershipId}
        readonly={ctx.readonly}
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
    </RealtimeProvider>
  );
}
