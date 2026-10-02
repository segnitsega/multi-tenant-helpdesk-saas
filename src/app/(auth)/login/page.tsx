import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";
import { env } from "@/server/env";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell title="Sign in" description="Access your Relay workspaces.">
      <LoginForm
        googleEnabled={Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET)}
      />
    </AuthShell>
  );
}
