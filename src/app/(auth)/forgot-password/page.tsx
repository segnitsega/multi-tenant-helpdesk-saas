import { AuthShell } from "@/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { redirectIfAuthenticated } from "@/features/auth/actions";

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated();

  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we’ll send a reset link if an account exists."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
