import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";
import { env } from "@/server/env";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; invite?: string }>;
}) {
  const params = await searchParams;
  if (!params.invite) {
    await redirectIfAuthenticated();
  }

  return (
    <AuthShell
      title="Create your account"
      description="Set up Relay for your team — invite agents when you’re ready."
    >
      <SignupForm
        googleEnabled={Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)}
        defaultEmail={typeof params.email === "string" ? params.email : ""}
      />
    </AuthShell>
  );
}
