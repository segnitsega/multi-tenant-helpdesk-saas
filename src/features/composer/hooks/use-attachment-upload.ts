"use client";

import { toast } from "sonner";
import {
  isAllowedUploadMimeType,
  isAllowedUploadSize,
} from "@/config/uploads";
import type { PendingAttachment } from "@/features/composer/components/attachment-chip";
import { confirmAttachmentAction } from "@/features/tickets/actions";

export async function uploadAttachmentFile(input: {
  slug: string;
  ticketNumber: number;
  file: File;
  onQueued: (attachment: PendingAttachment) => void;
  onUpdated: (id: string, patch: Partial<PendingAttachment>) => void;
}) {
  const { slug, ticketNumber, file, onQueued, onUpdated } = input;

  if (!isAllowedUploadMimeType(file.type)) {
    toast.error("That file type is not allowed.");
    return;
  }
  if (!isAllowedUploadSize(file.size)) {
    toast.error("File is too large (max 10 MB).");
    return;
  }

  const tempId = crypto.randomUUID();
  const previewUrl = file.type.startsWith("image/")
    ? URL.createObjectURL(file)
    : undefined;

  onQueued({
    id: tempId,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    previewUrl,
    progress: 0,
    status: "uploading",
  });

  try {
    const presign = await fetch(`/api/w/${slug}/uploads/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketNumber,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    });
    const presignJson = await presign.json();
    if (!presign.ok || !presignJson.ok) {
      throw new Error(presignJson.error?.message ?? "Could not start upload");
    }

    const { attachmentId, uploadUrl } = presignJson.data as {
      attachmentId: string;
      uploadUrl: string;
    };

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.round((event.loaded / event.total) * 100);
        onUpdated(tempId, { progress });
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error("Upload failed"));
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(file);
    });

    const confirmed = await confirmAttachmentAction(slug, { attachmentId });
    if (!confirmed.ok) {
      throw new Error(confirmed.error.message);
    }

    onUpdated(tempId, {
      id: attachmentId,
      status: "ready",
      progress: 100,
    });
  } catch (error) {
    onUpdated(tempId, { status: "error" });
    toast.error(
      error instanceof Error ? error.message : "Could not upload file",
    );
  }
}
