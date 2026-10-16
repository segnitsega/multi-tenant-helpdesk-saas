"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditorToolbar } from "@/features/composer/components/editor-toolbar";
import {
  CannedReplyPicker,
  type CannedReplyOption,
} from "@/features/composer/components/canned-reply-picker";
import {
  AttachmentChip,
  type PendingAttachment,
} from "@/features/composer/components/attachment-chip";
import { AttachmentUploader } from "@/features/composer/components/attachment-uploader";
import { useDraft } from "@/features/composer/hooks/use-draft";
import { uploadAttachmentFile } from "@/features/composer/hooks/use-attachment-upload";
import { cn } from "@/lib/utils";

export function Composer({
  slug,
  ticketNumber,
  mode,
  placeholder,
  cannedReplies,
  vars,
  sending,
  onSend,
}: {
  slug: string;
  ticketNumber: number;
  mode: "reply" | "note";
  placeholder: string;
  cannedReplies: CannedReplyOption[];
  vars: {
    customerName?: string | null;
    agentName?: string | null;
    ticketNumber?: number | null;
  };
  sending?: boolean;
  onSend: (input: {
    bodyHtml: string;
    attachmentIds: string[];
    afterStatus?: "PENDING" | "RESOLVED";
  }) => void;
}) {
  const [draftHtml, setDraftHtml, clearDraft] = useDraft(
    slug,
    ticketNumber,
    mode,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);

  const readyAttachmentIds = useMemo(
    () =>
      attachments
        .filter((row) => row.status === "ready")
        .map((row) => row.id),
    [attachments],
  );

  function queueFiles(files: File[]) {
    for (const file of files) {
      void uploadAttachmentFile({
        slug,
        ticketNumber,
        file,
        onQueued: (attachment) =>
          setAttachments((prev) => [...prev, attachment]),
        onUpdated: (id, patch) =>
          setAttachments((prev) =>
            prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
          ),
      });
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: draftHtml || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-24 px-3 py-2 focus:outline-none",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          send();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        queueFiles(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        queueFiles(files);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.getHTML();
      setDraftHtml(html);
      const text = current.getText();
      if (text.startsWith("/")) {
        setPickerOpen(true);
        setPickerQuery(text.slice(1));
      } else {
        setPickerOpen(false);
        setPickerQuery("");
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (draftHtml && editor.isEmpty) {
      editor.commands.setContent(draftHtml);
    }
  }, [draftHtml, editor]);

  function send(afterStatus?: "PENDING" | "RESOLVED") {
    if (!editor) return;
    const bodyHtml = editor.getHTML();
    if (editor.isEmpty && readyAttachmentIds.length === 0) return;
    if (attachments.some((row) => row.status === "uploading")) return;
    onSend({
      bodyHtml: editor.isEmpty ? "<p></p>" : bodyHtml,
      attachmentIds: readyAttachmentIds,
      afterStatus,
    });
    editor.commands.clearContent(true);
    clearDraft();
    setAttachments([]);
    setPickerOpen(false);
  }

  return (
    <div
      className={cn(
        "relative space-y-2 rounded-lg",
        dragging && "ring-primary ring-2 ring-offset-2",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        queueFiles(Array.from(event.dataTransfer.files ?? []));
      }}
    >
      <CannedReplyPicker
        open={pickerOpen}
        query={pickerQuery}
        replies={cannedReplies}
        vars={vars}
        onSelect={(html) => {
          editor?.commands.setContent(html);
          setDraftHtml(html);
          setPickerOpen(false);
        }}
      />
      <div className="border-border overflow-hidden rounded-lg border">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={(id) =>
                setAttachments((prev) => prev.filter((row) => row.id !== id))
              }
            />
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <AttachmentUploader
          slug={slug}
          ticketNumber={ticketNumber}
          onQueued={(attachment) =>
            setAttachments((prev) => [...prev, attachment])
          }
          onUpdated={(id, patch) =>
            setAttachments((prev) =>
              prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
            )
          }
        />
        {mode === "reply" ? (
          <div className="flex items-center">
            <Button
              type="button"
              disabled={sending}
              onClick={() => send()}
              className="rounded-r-none"
            >
              {sending ? "Sending…" : "Send"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="rounded-l-none border-l border-l-white/20"
                    disabled={sending}
                  />
                }
              >
                <ChevronDown className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => send()}>Send</DropdownMenuItem>
                <DropdownMenuItem onClick={() => send("PENDING")}>
                  Send and set Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => send("RESOLVED")}>
                  Send and Resolve
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button type="button" disabled={sending} onClick={() => send()}>
            {sending ? "Saving…" : "Add note"}
          </Button>
        )}
      </div>
    </div>
  );
}
