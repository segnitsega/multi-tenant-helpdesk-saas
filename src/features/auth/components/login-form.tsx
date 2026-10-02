"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, loginWithGoogle } from "@/features/auth/actions";
import { Field } from "./field";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {googleEnabled ? (
        <>
          <form action={loginWithGoogle}>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={pending}
            >
              Continue with Google
            </Button>
          </form>
          <div className="text-muted-foreground relative py-1 text-center text-xs">
            <span className="bg-card relative z-10 px-2">or</span>
            <div className="border-border absolute inset-x-0 top-1/2 border-t" />
          </div>
        </>
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
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </Field>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </p>
      <p className="text-muted-foreground text-center text-sm">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
