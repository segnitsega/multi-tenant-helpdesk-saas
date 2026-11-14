"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { StatusBadge, type TicketStatus } from "@/components/status-badge";
import { PriorityBadge, type TicketPriority } from "@/components/priority-badge";
import { SlaBadge } from "@/components/sla-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TicketListItem } from "@/features/tickets/types";
import { cn } from "@/lib/utils";

export function TicketRow({
  slug,
  ticket,
  selected,
  active,
  highlighted,
  onToggle,
}: {
  slug: string;
  ticket: TicketListItem;
  selected: boolean;
  active: boolean;
  highlighted?: boolean;
  onToggle: (number: number, checked: boolean) => void;
}) {
  const router = useRouter();
  const href = `/w/${slug}/inbox/${ticket.number}`;
  const name = ticket.customerName || ticket.customerEmail;
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "border-border hover:bg-muted/40 flex items-start gap-2 border-b px-3 py-2.5 transition-colors",
        active && "bg-muted/60",
        highlighted && "bg-sky-50 dark:bg-sky-950/40",
      )}
      onMouseEnter={() => {
        router.prefetch(href);
      }}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(value) => onToggle(ticket.number, value === true)}
        aria-label={`Select ticket ${ticket.number}`}
        className="mt-1"
      />
      <Link href={href} className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Avatar size="sm" className="mt-0.5">
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-foreground truncate text-sm font-medium">
                {name}
              </p>
              <span className="text-muted-foreground ml-auto shrink-0 font-mono text-[11px] tabular-nums">
                {formatDistanceToNowStrict(new Date(ticket.lastMessageAt), {
                  addSuffix: false,
                })}
              </span>
            </div>
            <p className="text-foreground mt-0.5 truncate text-sm font-semibold">
              #{ticket.number} {ticket.subject}
            </p>
            {ticket.preview ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {ticket.preview}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={ticket.status as TicketStatus} />
              <PriorityBadge priority={ticket.priority as TicketPriority} />
              {ticket.slaFirstResponseDueAt && !ticket.firstResponseAt ? (
                <SlaBadge
                  startsAt={ticket.createdAt}
                  dueAt={ticket.slaFirstResponseDueAt}
                />
              ) : null}
              {ticket.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                  style={{ borderLeft: `2px solid ${tag.color}` }}
                >
                  {tag.name}
                </span>
              ))}
              {ticket.tags.length > 2 ? (
                <span className="text-muted-foreground text-[10px]">
                  +{ticket.tags.length - 2}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
