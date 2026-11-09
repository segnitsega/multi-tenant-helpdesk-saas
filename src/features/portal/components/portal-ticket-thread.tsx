"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { portalReplyAction } from "@/features/portal/actions";

export function PortalTicketThread({
  slug,
  number,
  messages,
}: {
  slug: string;
  number: number;
  messages: Array<{
    id: string;
    authorType: string;
    bodyHtml: string;
    createdAt: string;
  }>;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.authorType === "CUSTOMER"
                ? "border-border rounded-lg border px-3 py-2"
                : "bg-muted/50 rounded-lg px-3 py-2"
            }
          >
            <p className="text-muted-foreground mb-1 text-xs">
              {message.authorType === "CUSTOMER" ? "You" : "Support"} ·{" "}
              {new Date(message.createdAt).toLocaleString()}
            </p>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            />
          </div>
        ))}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await portalReplyAction(slug, number, {
              bodyHtml: `<p>${body.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
            });
            if (!result.ok) {
              setError(result.error.message);
              return;
            }
            setBody("");
            router.refresh();
          });
        }}
      >
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={4}
          required
        />
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </div>
  );
}
