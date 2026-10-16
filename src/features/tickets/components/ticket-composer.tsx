"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Composer } from "@/features/composer/components/composer";
import type { CannedReplyOption } from "@/features/composer/components/canned-reply-picker";
import { addNoteAction, addReplyAction } from "@/features/tickets/actions";

export function TicketComposer({
  slug,
  ticketNumber,
  cannedReplies,
  customerName,
  agentName,
}: {
  slug: string;
  ticketNumber: number;
  cannedReplies: CannedReplyOption[];
  customerName?: string | null;
  agentName?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("reply");
  const [pending, startTransition] = useTransition();
  const vars = { customerName, agentName, ticketNumber };

  return (
    <div className="border-border bg-background sticky bottom-0 border-t p-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reply">Reply</TabsTrigger>
          <TabsTrigger value="note">Internal note</TabsTrigger>
        </TabsList>
        <TabsContent value="reply" className="mt-2">
          <Composer
            slug={slug}
            ticketNumber={ticketNumber}
            mode="reply"
            placeholder="Write a reply to the customer… Type / for canned replies"
            cannedReplies={cannedReplies}
            vars={vars}
            sending={pending}
            onSend={({ bodyHtml, attachmentIds, afterStatus }) => {
              startTransition(async () => {
                const result = await addReplyAction(slug, {
                  ticketNumber,
                  bodyHtml,
                  attachmentIds,
                  afterStatus,
                });
                if (!result.ok) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Reply sent");
                router.refresh();
              });
            }}
          />
        </TabsContent>
        <TabsContent value="note" className="mt-2">
          <Composer
            slug={slug}
            ticketNumber={ticketNumber}
            mode="note"
            placeholder="Write an internal note… Type / for canned replies"
            cannedReplies={cannedReplies}
            vars={vars}
            sending={pending}
            onSend={({ bodyHtml, attachmentIds }) => {
              startTransition(async () => {
                const result = await addNoteAction(slug, {
                  ticketNumber,
                  bodyHtml,
                  attachmentIds,
                });
                if (!result.ok) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success("Note added");
                router.refresh();
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
