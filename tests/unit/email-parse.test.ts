import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePostmarkInbound } from "@/server/email/inbound/parse";
import { shouldIgnoreInbound } from "@/server/email/inbound/guards";

function loadFixture(name: string) {
  const file = path.resolve("tests/fixtures/postmark", name);
  return JSON.parse(readFileSync(file, "utf8")) as unknown;
}

describe("parsePostmarkInbound", () => {
  it("normalizes a new thread payload", () => {
    const email = parsePostmarkInbound(loadFixture("new-thread.json"));
    expect(email.from).toBe("customer@example.com");
    expect(email.to).toBe("acme@mail.localhost");
    expect(email.subject).toContain("billing");
    expect(email.providerMessageId).toBe("pm-new-thread-001");
    expect(email.messageId).toBe("<customer-new-001@example.com>");
    expect(email.mailboxHash).toBeNull();
  });

  it("captures reply threading fields and stripped text", () => {
    const email = parsePostmarkInbound(loadFixture("reply.json"));
    expect(email.mailboxHash).toBe("t1");
    expect(email.strippedReply).toBe("Thanks, that fixed it.");
    expect(email.inReplyTo).toBe("<relay.agent-001@mail.localhost>");
    expect(email.references.length).toBeGreaterThan(0);
  });

  it("keeps attachment metadata", () => {
    const email = parsePostmarkInbound(loadFixture("with-attachment.json"));
    expect(email.attachments).toHaveLength(1);
    expect(email.attachments[0]?.filename).toBe("error.png");
    expect(email.attachments[0]?.contentType).toBe("image/png");
  });
});

describe("shouldIgnoreInbound", () => {
  it("ignores auto-replies", () => {
    const email = parsePostmarkInbound(loadFixture("auto-reply.json"));
    const result = shouldIgnoreInbound(email);
    expect(result.ok).toBe(false);
  });

  it("allows normal customer mail", () => {
    const email = parsePostmarkInbound(loadFixture("new-thread.json"));
    expect(shouldIgnoreInbound(email)).toEqual({ ok: true });
  });
});
