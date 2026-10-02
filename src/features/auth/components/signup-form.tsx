"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginWithGoogle, signUp } from "@/features/auth/actions";
import { Field } from "./field";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
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
            aria-invalid={!!fieldErrors.name}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={fieldErrors.email?.[0]}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            aria-invalid={!!fieldErrors.email}
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
          />
          <p className="text-muted-foreground text-xs">
            At least 8 characters.
          </p>
        </Field>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
