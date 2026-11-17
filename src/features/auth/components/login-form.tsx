"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/actions";
import { AuthDivider } from "./auth-divider";
import { Field } from "./field";
import { GoogleButton } from "./google-button";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
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
          startTransition(async () => {
            const result = await login({
              email: form.get("email"),
              password: form.get("password"),
            });
            if (!result.ok) setError(result.error);
          });
        }}
      >
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            placeholder="you@company.com"
            className="h-10"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="space-y-2">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="h-10"
            />
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>
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
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
