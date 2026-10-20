"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlaBadge } from "@/components/sla-badge";
import { useUpdateTicket } from "@/features/tickets/hooks/use-update-ticket";
import type { TicketDetail } from "@/features/tickets/types";

export function TicketHeader({
  slug,
  detail,
}: {
  slug: string;
  detail: TicketDetail;
}) {
  const update = useUpdateTicket(slug);
  const [subject, setSubject] = useState(detail.ticket.subject);
  const ticket = detail.ticket;

  return (
    <div className="border-border space-y-3 border-b px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground mt-1.5 font-mono text-sm">
          #{ticket.number}
        </span>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => {
            if (subject.trim() && subject !== ticket.subject) {
              update.mutate({ number: ticket.number, subject: subject.trim() });
            }
          }}
          className="h-9 border-transparent px-1 text-base font-semibold shadow-none focus-visible:border-input"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={ticket.status}
          onValueChange={(value) => {
            if (!value || value === ticket.status) return;
            update.mutate({
              number: ticket.number,
              status: value as "OPEN",
            });
          }}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ON_HOLD">On hold</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={ticket.priority}
          onValueChange={(value) => {
            if (!value || value === ticket.priority) return;
            update.mutate({
              number: ticket.number,
              priority: value as "NORMAL",
            });
          }}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={ticket.assigneeMembershipId ?? "unassigned"}
          onValueChange={(value) => {
            if (!value) return;
            update.mutate({
              number: ticket.number,
              assigneeMembershipId:
                value === "unassigned" ? null : value,
            });
          }}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {detail.members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {ticket.slaFirstResponseDueAt && !ticket.firstResponseAt ? (
          <SlaBadge
            startsAt={ticket.createdAt}
            dueAt={ticket.slaFirstResponseDueAt}
          />
        ) : null}
      </div>
      {ticket.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {ticket.tags.map((tag) => (
            <span
              key={tag.id}
              className="bg-muted rounded px-1.5 py-0.5 text-xs"
              style={{ borderLeft: `3px solid ${tag.color}` }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
