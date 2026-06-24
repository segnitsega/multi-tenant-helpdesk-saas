"use client";

import { TicketHeader } from "@/features/tickets/components/ticket-header";
import { MessageThread } from "@/features/tickets/components/message-thread";
import { TicketComposer } from "@/features/tickets/components/ticket-composer";
import { CustomerSidebar } from "@/features/tickets/components/customer-sidebar";
import {
  CollisionBanner,
  PresenceStack,
  TypingIndicator,
} from "@/features/realtime/presence";
import { usePresence } from "@/features/realtime/use-presence";
import type { TicketDetail as TicketDetailType } from "@/features/tickets/types";

export function TicketDetail({
  slug,
  detail,
}: {
  slug: string;
  detail: TicketDetailType;
}) {
  const presence = usePresence(detail.ticket.id);

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <TicketHeader slug={slug} detail={detail} />
        <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2">
          <PresenceStack viewers={presence.viewers} />
          <TypingIndicator name={presence.typing?.name} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MessageThread slug={slug} messages={detail.messages} />
        </div>
        <div className="space-y-2 px-3 pt-2">
          <CollisionBanner name={presence.draftingOther?.name} />
        </div>
        <TicketComposer
          slug={slug}
          ticketNumber={detail.ticket.number}
          ticketId={detail.ticket.id}
          cannedReplies={detail.cannedReplies}
          customerName={detail.customer.name}
          agentName={detail.agentName}
          onTypingChange={(isTyping) => {
            void presence.setTypingState(isTyping);
          }}
        />
      </div>
      <CustomerSidebar slug={slug} detail={detail} />
    </div>
  );
}
