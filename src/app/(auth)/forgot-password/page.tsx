import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Forgot password"
      description="We’ll email you a reset link if that account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
