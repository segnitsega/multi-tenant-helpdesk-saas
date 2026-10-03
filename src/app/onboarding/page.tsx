import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { listWorkspacesForUser } from "@/server/tenancy/context";
import { OnboardingWizard } from "@/features/workspaces/components/onboarding-wizard";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const workspaces = await listWorkspacesForUser(session.user.id);
  const creating = params.new === "1";

  if (workspaces.length === 1 && workspaces[0] && !creating) {
    redirect(`/w/${workspaces[0].slug}`);
  }

  if (workspaces.length > 0 && !creating) {
    return (
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
        <div className="absolute top-4 right-4">
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your workspaces
        </h1>
        <ul className="mt-6 space-y-2">
          {workspaces.map((ws) => (
            <li key={ws.workspaceId}>
              <a
                href={`/w/${ws.slug}`}
                className="hover:bg-muted block rounded-lg border border-border px-4 py-3 text-sm"
              >
                {ws.name}
                <span className="text-muted-foreground ml-2">
                  /w/{ws.slug}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Button
            nativeButton={false}
            render={<a href="/onboarding?new=1" />}
          >
            Create another workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4">
        <form action={logout}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
      <OnboardingWizard
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ""}
      />
    </div>
  );
}
