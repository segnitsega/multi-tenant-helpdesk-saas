"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvitationAction } from "@/features/workspaces/actions";

export function AcceptInvite({
  token,
  workspaceName,
  email,
  signedInEmail,
}: {
  token: string;
  workspaceName: string;
  email: string;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedInEmail) {
    return (
      <div className="space-y-4">
        <p className="text-sm">
          Create an account or sign in as <strong>{email}</strong> to join{" "}
          {workspaceName}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/signup?email=${encodeURIComponent(email)}&invite=${encodeURIComponent(token)}`}
              />
            }
          >
            Sign up
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/login?email=${encodeURIComponent(email)}&invite=${encodeURIComponent(token)}`}
              />
            }
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (signedInEmail.toLowerCase() !== email.toLowerCase()) {
    return (
      <div className="space-y-4">
        <p className="text-sm" role="alert">
          You’re signed in as {signedInEmail}. This invite is for {email}.
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Switch account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Join <strong>{workspaceName}</strong> as {email}?
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptInvitationAction(token);
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            router.push(`/w/${result.data?.slug}`);
          });
        }}
      >
        {pending ? "Joining…" : "Accept invitation"}
      </Button>
    </div>
  );
}
