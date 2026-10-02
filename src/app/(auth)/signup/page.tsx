import { AuthShell } from "@/features/auth/components/auth-shell";
import { SignupForm } from "@/features/auth/components/signup-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";
import { env } from "@/server/env";

export default async function SignupPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Create your account"
      description="Start with Relay in a minute."
    >
      <SignupForm
        googleEnabled={Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)}
      />
    </AuthShell>
  );
}
