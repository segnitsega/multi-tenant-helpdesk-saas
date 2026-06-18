import { describe, expect, it } from "vitest";
import { matchInboundThread } from "@/server/email/inbound/match-thread";

describe("matchInboundThread", () => {
  const ticket = { id: "ticket-1", number: 1 };
  const ticketsByNumber = new Map([[1, ticket]]);
  const ticketsById = new Map([["ticket-1", ticket]]);
  const messagesByEmailId = new Map([
    [
      "<relay.agent-001@mail.localhost>",
      { ticketId: "ticket-1", emailMessageId: "<relay.agent-001@mail.localhost>" },
    ],
  ]);

  it("matches mailbox hash first", () => {
    const result = matchInboundThread({
      mailboxHash: "t1",
      inReplyTo: null,
      references: [],
      ticketsByNumber,
      ticketsById,
      messagesByEmailId,
    });
    expect(result).toEqual({ type: "existing", ticket });
  });

  it("matches In-Reply-To when hash is missing", () => {
    const result = matchInboundThread({
      mailboxHash: null,
      inReplyTo: "<relay.agent-001@mail.localhost>",
      references: [],
      ticketsByNumber,
      ticketsById,
      messagesByEmailId,
    });
    expect(result).toEqual({ type: "existing", ticket });
  });

  it("falls back to a new ticket", () => {
    const result = matchInboundThread({
      mailboxHash: null,
      inReplyTo: null,
      references: [],
      ticketsByNumber,
      ticketsById,
      messagesByEmailId,
    });
    expect(result).toEqual({ type: "new" });
  });
});
