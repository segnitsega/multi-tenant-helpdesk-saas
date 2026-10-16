"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingAttachment } from "@/features/composer/components/attachment-chip";
import { uploadAttachmentFile } from "@/features/composer/hooks/use-attachment-upload";

export function AttachmentUploader({
  slug,
  ticketNumber,
  onQueued,
  onUpdated,
}: {
  slug: string;
  ticketNumber: number;
  onQueued: (attachment: PendingAttachment) => void;
  onUpdated: (id: string, patch: Partial<PendingAttachment>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          for (const file of files) {
            void uploadAttachmentFile({
              slug,
              ticketNumber,
              file,
              onQueued,
              onUpdated,
            });
          }
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Attach file"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="size-3.5" />
      </Button>
    </>
  );
}
