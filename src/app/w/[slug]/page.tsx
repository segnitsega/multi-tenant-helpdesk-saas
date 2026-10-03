import { getTenantContext } from "@/server/tenancy/context";
import { getWorkspaceById } from "@/server/services/workspace.service";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  const workspace = await getWorkspaceById(ctx.workspaceId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        {workspace?.name ?? slug}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Workspace shell is ready. The inbox UI arrives in Phase 8.
      </p>
    </div>
  );
}
