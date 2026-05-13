import { normalizeMessageId, parseTicketMailboxToken } from "@/lib/email-address";

export type ThreadMatchTicket = {
  id: string;
  number: number;
};

export type ThreadMatchMessage = {
  ticketId: string;
  emailMessageId: string | null;
};

export type ThreadMatchResult =
  | { type: "existing"; ticket: ThreadMatchTicket }
  | { type: "new" };

export function matchInboundThread(input: {
  mailboxHash: string | null;
  inReplyTo: string | null;
  references: string[];
  ticketsByNumber: Map<number, ThreadMatchTicket>;
  messagesByEmailId: Map<string, ThreadMatchMessage>;
  ticketsById: Map<string, ThreadMatchTicket>;
}): ThreadMatchResult {
  const ticketNumber = parseTicketMailboxToken(input.mailboxHash);
  if (ticketNumber != null) {
    const ticket = input.ticketsByNumber.get(ticketNumber);
    if (ticket) return { type: "existing", ticket };
  }

  const candidates = [
    normalizeMessageId(input.inReplyTo),
    ...input.references.map((ref) => normalizeMessageId(ref)),
  ].filter((value): value is string => Boolean(value));

  for (const messageId of candidates) {
    const message =
      input.messagesByEmailId.get(messageId) ??
      input.messagesByEmailId.get(messageId.replace(/^<|>$/g, ""));
    if (!message) continue;
    const ticket = input.ticketsById.get(message.ticketId);
    if (ticket) return { type: "existing", ticket };
  }

  return { type: "new" };
}
