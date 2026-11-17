"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/actions";
import { Field } from "./field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm" role="alert">
          This reset link is missing or invalid.
        </p>
        <p className="text-muted-foreground text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setFieldErrors({});
          startTransition(async () => {
            const result = await resetPassword({
              token,
              password: form.get("password"),
            });
            if (!result.ok) {
              setError(result.error);
              setFieldErrors(result.fieldErrors ?? {});
            }
          });
        }}
      >
        <Field
          label="New password"
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
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
