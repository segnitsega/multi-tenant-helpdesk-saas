"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { portalNewRequestAction } from "@/features/portal/actions";

export function PortalNewRequestForm({ slug }: { slug: string }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await portalNewRequestAction(slug, {
            subject,
            bodyHtml: `<p>${body.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
          });
          if (result && !result.ok) {
            setError(result.error.message);
          }
        });
      }}
    >
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        required
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe your request"
        rows={6}
        required
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !subject.trim() || !body.trim()}>
        {pending ? "Creating…" : "Submit request"}
      </Button>
    </form>
  );
}
