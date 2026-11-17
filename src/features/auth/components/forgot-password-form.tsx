"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions";
import { Field } from "./field";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        method="post"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await requestPasswordReset({
              email: form.get("email"),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Check your email for a reset link.");
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
        {error ? (
          <p
            className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            className="border-border bg-muted/40 text-foreground rounded-lg border px-3 py-2 text-sm"
            role="status"
          >
            {message}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
