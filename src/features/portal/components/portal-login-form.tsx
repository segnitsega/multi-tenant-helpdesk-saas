"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requestMagicLinkAction } from "@/features/portal/actions";

export function PortalLoginForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <p className="text-sm" role="status">
        Check your inbox for a sign-in link. It expires in 15 minutes.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestMagicLinkAction(slug, { email });
          if (!result.ok) {
            setError(result.error.message);
            return;
          }
          setSent(true);
        });
      }}
    >
      <Input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !email.trim()}>
        {pending ? "Sending…" : "Email me a link"}
      </Button>
    </form>
  );
}
