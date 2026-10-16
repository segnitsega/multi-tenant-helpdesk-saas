"use client";

import { TicketHeader } from "@/features/tickets/components/ticket-header";
import { MessageThread } from "@/features/tickets/components/message-thread";
import { TicketComposer } from "@/features/tickets/components/ticket-composer";
import { CustomerSidebar } from "@/features/tickets/components/customer-sidebar";
import type { TicketDetail as TicketDetailType } from "@/features/tickets/types";

export function TicketDetail({
  slug,
  detail,
}: {
  slug: string;
  detail: TicketDetailType;
}) {
  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <TicketHeader slug={slug} detail={detail} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageThread slug={slug} messages={detail.messages} />
        </div>
        <TicketComposer
          slug={slug}
          ticketNumber={detail.ticket.number}
          cannedReplies={detail.cannedReplies}
          customerName={detail.customer.name}
          agentName={detail.agentName}
        />
      </div>
      <CustomerSidebar slug={slug} detail={detail} />
    </div>
  );
}
