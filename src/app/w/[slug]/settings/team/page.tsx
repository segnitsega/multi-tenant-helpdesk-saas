import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { listMembers } from "@/server/services/membership.service";
import { listPendingInvitations } from "@/server/services/invitation.service";
import { TeamSettings } from "@/features/workspaces/components/team-settings";
import { SettingsLayout } from "@/components/layout/settings-layout";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "member.manage");
  } catch (e) {
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  const [members, invitations] = await Promise.all([
    listMembers(ctx.workspaceId),
    listPendingInvitations(ctx.workspaceId),
  ]);

  return (
    <SettingsLayout
      title="Team"
      description="Manage members and invitations for this workspace."
    >
      <TeamSettings
        slug={slug}
        currentUserId={ctx.userId}
        currentRole={ctx.role}
        members={members}
        invitations={invitations.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          expiresAt: row.expiresAt.toISOString(),
        }))}
      />
    </SettingsLayout>
  );
}
