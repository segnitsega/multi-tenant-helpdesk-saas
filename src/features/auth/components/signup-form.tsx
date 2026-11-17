"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/features/auth/actions";
import { AuthDivider } from "./auth-divider";
import { Field } from "./field";
import { GoogleButton } from "./google-button";

export function SignupForm({
  googleEnabled,
  defaultEmail = "",
}: {
  googleEnabled: boolean;
  defaultEmail?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      {googleEnabled ? (
        <div className="space-y-4">
          <GoogleButton disabled={pending} />
          <AuthDivider />
        </div>
      ) : null}

      <form
        method="post"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setFieldErrors({});
          startTransition(async () => {
            const result = await signUp({
              name: form.get("name"),
              email: form.get("email"),
              password: form.get("password"),
            });
            if (!result.ok) {
              setError(result.error);
              setFieldErrors(result.fieldErrors ?? {});
            }
          });
        }}
      >
        <Field label="Name" htmlFor="name" error={fieldErrors.name?.[0]}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            disabled={pending}
            placeholder="Jordan Lee"
            aria-invalid={!!fieldErrors.name}
            className="h-10"
          />
        </Field>
        <Field label="Work email" htmlFor="email" error={fieldErrors.email?.[0]}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
            disabled={pending || !!defaultEmail}
            placeholder="you@company.com"
            aria-invalid={!!fieldErrors.email}
            className="h-10"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={fieldErrors.password?.[0]}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            disabled={pending}
            aria-invalid={!!fieldErrors.password}
            className="h-10"
          />
          <p className="text-muted-foreground text-xs">
            Use at least 8 characters.
          </p>
        </Field>
        {error ? (
          <p
            className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-xs leading-relaxed">
        By continuing you agree to use Relay for your team&apos;s support
        workspace.
      </p>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
