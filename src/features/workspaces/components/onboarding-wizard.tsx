"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/auth/components/field";
import {
  checkSlugAvailability,
  createWorkspaceAction,
  inviteMemberAction,
} from "@/features/workspaces/actions";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function OnboardingWizard({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(
    userName ? `${userName.split(" ")[0]}'s workspace` : "",
  );
  const [slug, setSlug] = useState(() => slugify(name));
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      setSlugError(null);
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(() => {
      void checkSlugAvailability(slug).then((result) => {
        if (result.error) {
          setSlugStatus("invalid");
          setSlugError(result.error);
          return;
        }
        setSlugError(null);
        setSlugStatus(result.available ? "available" : "taken");
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [slug]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <p className="text-muted-foreground text-sm font-medium">Relay</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {step === 1 && "Create your workspace"}
        {step === 2 && "Invite teammates"}
        {step === 3 && "Connect email"}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Signed in as {userEmail}. Step {step} of 3.
      </p>

      <div className="mt-8 space-y-4">
        {step === 1 ? (
          <>
            <Field label="Workspace name" htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                required
              />
            </Field>
            <Field
              label="Workspace URL"
              htmlFor="slug"
              error={
                slugError ??
                (slugStatus === "taken" ? "That URL is taken." : undefined)
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/w/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  disabled={pending}
                  required
                />
              </div>
              {slugStatus === "available" ? (
                <p className="text-muted-foreground text-xs">Available</p>
              ) : null}
              {slugStatus === "checking" ? (
                <p className="text-muted-foreground text-xs">Checking…</p>
              ) : null}
            </Field>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              className="w-full"
              disabled={
                pending ||
                !name.trim() ||
                slugStatus !== "available"
              }
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await createWorkspaceAction({ name, slug });
                  if (!result.ok) {
                    setError(result.error.message);
                    return;
                  }
                  setCreatedSlug(result.data?.slug ?? slug);
                  setStep(2);
                });
              }}
            >
              {pending ? "Creating…" : "Continue"}
            </Button>
          </>
        ) : null}

        {step === 2 && createdSlug ? (
          <>
            <Field label="Teammate email" htmlFor="inviteEmail">
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="alex@company.com"
                disabled={pending}
              />
            </Field>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending || !inviteEmail.trim()}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await inviteMemberAction(createdSlug, {
                      email: inviteEmail,
                      role: "AGENT",
                    });
                    if (!result.ok) {
                      setError(result.error.message);
                      return;
                    }
                    setInviteEmail("");
                    setStep(3);
                  });
                }}
              >
                {pending ? "Sending…" : "Send invite"}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setStep(3)}
              >
                Skip for now
              </Button>
            </div>
          </>
        ) : null}

        {step === 3 && createdSlug ? (
          <>
            <p className="text-muted-foreground text-sm">
              Forward support mail to your inbound address later. You can
              configure this under Settings → Email.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/w/${createdSlug}`)}
            >
              Open workspace
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
