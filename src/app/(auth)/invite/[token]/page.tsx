import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { getInvitationByToken } from "@/server/services/invitation.service";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { AcceptInvite } from "@/features/workspaces/components/accept-invite";
import { Button } from "@/components/ui/button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();
  const invitation = await getInvitationByToken(token);

  if (invitation.status === "not_found") {
    return (
      <AuthShell title="Invitation not found">
        <p className="text-muted-foreground text-sm">
          This invite link is invalid.
        </p>
        <Button
          className="mt-4"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Go to sign in
        </Button>
      </AuthShell>
    );
  }

  if (invitation.status === "expired") {
    return (
      <AuthShell title="Invitation expired">
        <p className="text-muted-foreground text-sm">
          Ask an admin of {invitation.workspaceName} to send a new invite to{" "}
          {invitation.email}.
        </p>
      </AuthShell>
    );
  }

  if (invitation.status === "accepted") {
    return (
      <AuthShell title="Already accepted">
        <p className="text-muted-foreground text-sm">
          This invitation was already used.
        </p>
        <Button
          className="mt-4"
          nativeButton={false}
          render={<Link href={`/w/${invitation.slug}`} />}
        >
          Open workspace
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Join ${invitation.workspaceName}`}
      description={`Invited as ${invitation.role}`}
    >
      <AcceptInvite
        token={token}
        workspaceName={invitation.workspaceName}
        email={invitation.email}
        signedInEmail={session?.user?.email ?? null}
      />
    </AuthShell>
  );
}
