"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComposerLazy } from "@/features/composer/components/composer-lazy";
import type { CannedReplyOption } from "@/features/composer/components/canned-reply-picker";
import { addNoteAction, addReplyAction } from "@/features/tickets/actions";
import { useHotkeys } from "@/hooks/use-hotkeys";

export function TicketComposer({
  slug,
  ticketNumber,
  ticketId,
  cannedReplies,
  customerName,
  agentName,
  readonly = false,
  onTypingChange,
}: {
  slug: string;
  ticketNumber: number;
  ticketId?: string;
  cannedReplies: CannedReplyOption[];
  customerName?: string | null;
  agentName?: string | null;
  readonly?: boolean;
  onTypingChange?: (isTyping: boolean) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("reply");
  const [pending, startTransition] = useTransition();
  const lastTypingSent = useRef(0);
  const focusRequest = useRef<"reply" | "note" | null>(null);
  const vars = { customerName, agentName, ticketNumber };

  useHotkeys(
    "r",
    () => {
      focusRequest.current = "reply";
      setTab("reply");
    },
    { enabled: !readonly },
  );

  useHotkeys(
    "n",
    () => {
      focusRequest.current = "note";
      setTab("note");
    },
    { enabled: !readonly },
  );

  useEffect(() => {
    if (!focusRequest.current || focusRequest.current !== tab) return;
    focusRequest.current = null;
    const id = window.setTimeout(() => {
      const editor = document.querySelector(
        `[data-composer-mode="${tab}"] .ProseMirror`,
      );
      if (editor instanceof HTMLElement) editor.focus();
    }, 40);
    return () => window.clearTimeout(id);
  }, [tab]);

  function handleTyping(hasContent: boolean) {
    if (!onTypingChange || !ticketId) return;
    const now = Date.now();
    if (hasContent && now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = now;
    onTypingChange(hasContent);
  }

  if (readonly) {
    return (
      <div className="border-border bg-muted/40 text-muted-foreground sticky bottom-0 border-t px-4 py-3 text-sm">
        Composer is disabled in read-only demo mode.
      </div>
    );
  }

  return (
    <div className="border-border bg-background sticky bottom-0 border-t p-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reply">Reply</TabsTrigger>
          <TabsTrigger value="note">Internal note</TabsTrigger>
        </TabsList>
        <TabsContent value="reply" className="mt-2" data-composer-mode="reply">
          <ComposerLazy
            slug={slug}
            ticketNumber={ticketNumber}
            mode="reply"
            placeholder="Write a reply to the customer… Type / for canned replies"
            cannedReplies={cannedReplies}
            vars={vars}
            sending={pending}
            onTypingChange={handleTyping}
            onSend={({ bodyHtml, attachmentIds, afterStatus }) => {
              onTypingChange?.(false);
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
        <TabsContent value="note" className="mt-2" data-composer-mode="note">
          <ComposerLazy
            slug={slug}
            ticketNumber={ticketNumber}
            mode="note"
            placeholder="Write an internal note… Type / for canned replies"
            cannedReplies={cannedReplies}
            vars={vars}
            sending={pending}
            onTypingChange={handleTyping}
            onSend={({ bodyHtml, attachmentIds }) => {
              onTypingChange?.(false);
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
