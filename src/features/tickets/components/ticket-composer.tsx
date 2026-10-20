"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addNoteAction, addReplyAction } from "@/features/tickets/actions";

export function TicketComposer({
  slug,
  ticketNumber,
}: {
  slug: string;
  ticketNumber: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("reply");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const html = `<p>${body.trim().replace(/\n/g, "<br/>")}</p>`;
      const result =
        tab === "note"
          ? await addNoteAction(slug, { ticketNumber, bodyHtml: html })
          : await addReplyAction(slug, { ticketNumber, bodyHtml: html });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setBody("");
      toast.success(tab === "note" ? "Note added" : "Reply sent");
      router.refresh();
    });
  }

  return (
    <div className="border-border bg-background sticky bottom-0 border-t p-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reply">Reply</TabsTrigger>
          <TabsTrigger value="note">Internal note</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-2 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              tab === "note"
                ? "Write an internal note…"
                : "Write a reply to the customer…"
            }
            rows={4}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                send();
              }
            }}
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={pending || !body.trim()}>
              {pending ? "Sending…" : tab === "note" ? "Add note" : "Send reply"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
