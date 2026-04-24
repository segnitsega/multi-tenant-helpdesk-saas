export type RealtimeEventType =
  | "ticket.created"
  | "ticket.updated"
  | "message.created"
  | "presence.updated"
  | "typing.updated"
  | "sla.breached"
  | "resync";

export type RealtimeEventBase = {
  id: string;
  type: RealtimeEventType;
  workspaceId: string;
  ticketId?: string;
  actorMembershipId?: string | null;
  ts: string;
};

export type TicketCreatedPayload = {
  ticketId: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
};

export type TicketUpdatedPayload = {
  ticketId: string;
  number: number;
  patch: Record<string, unknown>;
};

export type MessageCreatedPayload = {
  ticketId: string;
  ticketNumber: number;
  message: {
    id: string;
    authorType: string;
    authorMembershipId: string | null;
    authorCustomerId: string | null;
    kind: string;
    bodyHtml: string;
    bodyText: string;
    deliveryStatus: string | null;
    createdAt: string;
  };
};

export type PresenceViewer = {
  membershipId: string;
  name: string;
  drafting?: boolean;
};

export type PresenceUpdatedPayload = {
  ticketId: string;
  viewers: PresenceViewer[];
};

export type TypingUpdatedPayload = {
  ticketId: string;
  membershipId: string;
  name: string;
  isTyping: boolean;
};

export type SlaBreachedPayload = {
  ticketId: string;
  number: number;
  kind: "first_response" | "resolution";
};

export type ResyncPayload = {
  reason: "gap_too_large" | "reconnect";
};

export type RealtimeEvent =
  | (RealtimeEventBase & {
      type: "ticket.created";
      payload: TicketCreatedPayload;
    })
  | (RealtimeEventBase & {
      type: "ticket.updated";
      payload: TicketUpdatedPayload;
    })
  | (RealtimeEventBase & {
      type: "message.created";
      payload: MessageCreatedPayload;
    })
  | (RealtimeEventBase & {
      type: "presence.updated";
      payload: PresenceUpdatedPayload;
    })
  | (RealtimeEventBase & {
      type: "typing.updated";
      payload: TypingUpdatedPayload;
    })
  | (RealtimeEventBase & {
      type: "sla.breached";
      payload: SlaBreachedPayload;
    })
  | (RealtimeEventBase & {
      type: "resync";
      payload: ResyncPayload;
    });

export function channelForWorkspace(workspaceId: string): string {
  return `ws:${workspaceId}`;
}

export function recentKeyForWorkspace(workspaceId: string): string {
  return `ws:${workspaceId}:recent`;
}

export function seqKeyForWorkspace(workspaceId: string): string {
  return `ws:${workspaceId}:seq`;
}

export function presenceKey(ticketId: string, membershipId: string): string {
  return `presence:${ticketId}:${membershipId}`;
}

export function presencePattern(ticketId: string): string {
  return `presence:${ticketId}:*`;
}
