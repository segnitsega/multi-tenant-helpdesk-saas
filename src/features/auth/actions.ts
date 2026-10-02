"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/server/auth/auth";
import {
  consumePasswordResetToken,
  createPasswordResetForEmail,
  createUserWithPassword,
  findUserByEmail,
} from "@/server/auth/users";
import { getClientIp } from "@/server/auth/request-meta";
import { checkRateLimit, RateLimitError } from "@/server/rate-limit";
import { getEmailProvider } from "@/server/email";
import { resetPasswordEmail } from "@/server/email/templates/reset-password";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validators/auth";

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fieldErrorsFromZod(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value?.length) out[key] = value;
  }
  return out;
}

export async function signUp(raw: unknown): Promise<AuthActionResult> {
  try {
    const ip = await getClientIp();
    await checkRateLimit(`signup:${ip}`, 5, 60 * 60);

    const parsed = signUpSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Check the form and try again.",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      };
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await findUserByEmail(email);
    if (existing) {
      return { ok: false, error: "An account with this email already exists." };
    }

    await createUserWithPassword({
      email,
      name: parsed.data.name,
      password: parsed.data.password,
    });

    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function login(raw: unknown): Promise<AuthActionResult> {
  try {
    const ip = await getClientIp();
    await checkRateLimit(`login:${ip}`, 20, 60 * 15);

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Invalid email or password." };
    }

    await signIn("credentials", {
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof AuthError) {
      const cause = (error as { cause?: { code?: string } }).cause;
      if (cause?.code === "ETIMEDOUT" || cause?.code === "ECONNRESET") {
        return {
          ok: false,
          error: "Database temporarily unavailable. Try again in a moment.",
        };
      }
      return { ok: false, error: "Invalid email or password." };
    }
    throw error;
  }
}

export async function loginWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/onboarding" });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function requestPasswordReset(
  raw: unknown,
): Promise<AuthActionResult> {
  try {
    const ip = await getClientIp();
    await checkRateLimit(`forgot:${ip}`, 5, 60 * 60);

    const parsed = forgotPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Enter a valid email.",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      };
    }

    const email = parsed.data.email.trim().toLowerCase();
    const reset = await createPasswordResetForEmail(email);

    if (reset) {
      await checkRateLimit(`forgot-email:${email}`, 3, 60 * 60);
      const content = resetPasswordEmail({
        name: reset.user.name,
        token: reset.token,
      });
      await getEmailProvider().sendEmail({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
    }

    return {
      ok: true,
      message:
        "If an account exists for that email, we sent a reset link. Check Mailpit locally.",
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function resetPassword(raw: unknown): Promise<AuthActionResult> {
  try {
    const ip = await getClientIp();
    await checkRateLimit(`reset:${ip}`, 10, 60 * 60);

    const parsed = resetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Check the form and try again.",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      };
    }

    const user = await consumePasswordResetToken({
      token: parsed.data.token,
      password: parsed.data.password,
    });

    if (!user) {
      return {
        ok: false,
        error: "This reset link is invalid or has expired.",
      };
    }

    await signIn("credentials", {
      email: user.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof AuthError) {
      return { ok: false, error: "Could not sign you in after the reset." };
    }
    throw error;
  }
}

export async function redirectIfAuthenticated(to = "/onboarding") {
  const session = await auth();
  if (session?.user) redirect(to);
}
