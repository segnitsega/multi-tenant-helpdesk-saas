"use client";

import { useState } from "react";
import { FileIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PendingAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;
  progress: number;
  status: "uploading" | "ready" | "error";
};

export function AttachmentChip({
  attachment,
  onRemove,
  href,
}: {
  attachment: PendingAttachment;
  onRemove?: (id: string) => void;
  href?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isImage = attachment.mimeType.startsWith("image/");
  const canPreview = isImage && Boolean(attachment.previewUrl || href);

  return (
    <>
      <div className="border-border bg-muted/40 flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
        {isImage && (attachment.previewUrl || href) ? (
          <button
            type="button"
            className="shrink-0"
            onClick={() => canPreview && setPreviewOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.previewUrl ?? href}
              alt=""
              className="size-8 rounded object-cover"
            />
          </button>
        ) : (
          <FileIcon className="text-muted-foreground size-4" />
        )}
        <div className="min-w-0">
          {href ? (
            <a
              href={href}
              className="block truncate font-medium underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {attachment.filename}
            </a>
          ) : (
            <p className="truncate font-medium">{attachment.filename}</p>
          )}
          <p className="text-muted-foreground">
            {attachment.status === "uploading"
              ? `${attachment.progress}%`
              : attachment.status === "error"
                ? "Upload failed"
                : `${Math.ceil(attachment.sizeBytes / 1024)} KB`}
          </p>
        </div>
        {onRemove ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label="Remove attachment"
            onClick={() => onRemove(attachment.id)}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
      {canPreview ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{attachment.filename}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.previewUrl ?? href}
              alt={attachment.filename}
              className="max-h-[70vh] w-full object-contain"
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
