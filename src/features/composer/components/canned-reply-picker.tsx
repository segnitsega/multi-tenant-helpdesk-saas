"use client";

import { renderCannedBody } from "@/lib/canned-reply";

export type CannedReplyOption = {
  id: string;
  title: string;
  shortcut: string | null;
  bodyHtml: string;
};

export function CannedReplyPicker({
  open,
  query,
  replies,
  vars,
  onSelect,
}: {
  open: boolean;
  query: string;
  replies: CannedReplyOption[];
  vars: {
    customerName?: string | null;
    agentName?: string | null;
    ticketNumber?: number | null;
  };
  onSelect: (html: string) => void;
}) {
  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = replies.filter((reply) => {
    if (!q) return true;
    return (
      reply.title.toLowerCase().includes(q) ||
      (reply.shortcut?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="border-border bg-popover absolute bottom-full left-0 z-20 mb-2 w-full max-w-md overflow-hidden rounded-lg border shadow-md">
      <div className="text-muted-foreground border-border border-b px-3 py-1.5 text-xs font-medium">
        Canned replies
      </div>
      <ul className="max-h-56 overflow-y-auto py-1">
        {filtered.map((reply) => (
          <li key={reply.id}>
            <button
              type="button"
              className="hover:bg-muted flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm"
              onClick={() =>
                onSelect(renderCannedBody(reply.bodyHtml, vars))
              }
            >
              <span className="font-medium">{reply.title}</span>
              {reply.shortcut ? (
                <span className="text-muted-foreground font-mono text-[11px]">
                  /{reply.shortcut}
                </span>
              ) : null}
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="text-muted-foreground px-3 py-4 text-sm">
            No canned replies match.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
