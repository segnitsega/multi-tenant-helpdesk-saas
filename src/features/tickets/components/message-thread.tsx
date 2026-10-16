"use client";

import { Lock } from "lucide-react";
import { format } from "date-fns";
import { AttachmentChip } from "@/features/composer/components/attachment-chip";
import type { TicketMessage } from "@/features/tickets/types";
import { cn } from "@/lib/utils";

export function MessageThread({
  slug,
  messages,
}: {
  slug: string;
  messages: TicketMessage[];
}) {
  return (
    <div className="space-y-3 px-4 py-4">
      {messages.map((message) => {
        if (message.kind === "EVENT") {
          return (
            <div
              key={message.id}
              className="text-muted-foreground flex justify-center text-center text-xs"
            >
              <span className="bg-muted rounded-full px-2 py-1">
                {message.bodyText} ·{" "}
                {format(new Date(message.createdAt), "MMM d, HH:mm")}
              </span>
            </div>
          );
        }

        if (message.kind === "NOTE") {
          return (
            <div
              key={message.id}
              className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-amber-950/40"
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                <Lock className="size-3" />
                Internal note · only visible to your team
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
              <MessageAttachments slug={slug} message={message} />
              <p className="text-muted-foreground mt-1 text-[11px]">
                {format(new Date(message.createdAt), "MMM d, HH:mm")}
              </p>
            </div>
          );
        }

        const fromCustomer = message.authorType === "CUSTOMER";
        return (
          <div
            key={message.id}
            className={cn(
              "flex",
              fromCustomer ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                fromCustomer
                  ? "bg-muted text-foreground"
                  : "bg-primary/10 text-foreground",
              )}
            >
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">
                {fromCustomer ? "Customer" : "Agent"} ·{" "}
                {format(new Date(message.createdAt), "MMM d, HH:mm")}
              </p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
              <MessageAttachments slug={slug} message={message} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MessageAttachments({
  slug,
  message,
}: {
  slug: string;
  message: TicketMessage;
}) {
  if (message.attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {message.attachments.map((attachment) => (
        <AttachmentChip
          key={attachment.id}
          href={`/api/w/${slug}/attachments/${attachment.id}`}
          attachment={{
            id: attachment.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            progress: 100,
            status: "ready",
            previewUrl: attachment.mimeType.startsWith("image/")
              ? `/api/w/${slug}/attachments/${attachment.id}`
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
