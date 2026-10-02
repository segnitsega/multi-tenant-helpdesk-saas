import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export default async function OnboardingPage() {
  const session = await auth();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <p className="text-muted-foreground text-sm font-medium">Relay</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        You’re signed in as {session?.user?.email}. Workspace setup lands in
        Phase 5.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href="/" />}>
          Back home
        </Button>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
