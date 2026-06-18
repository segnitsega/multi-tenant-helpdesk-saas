import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import { withTenantDb } from "@/server/db";
import { processEmailInbound } from "@/server/jobs/processors/email-inbound";

vi.mock("@/server/storage/s3", () => ({
  putObject: vi.fn(async () => undefined),
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => undefined),
  RateLimitError: class RateLimitError extends Error {},
}));

function loadFixture(name: string) {
  return JSON.parse(
    readFileSync(path.resolve("tests/fixtures/postmark", name), "utf8"),
  ) as Record<string, unknown>;
}

describe("email inbound processor", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;

  beforeAll(async () => {
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Inbound ${suffix}`,
      slug: `acme-${suffix}`,
      inboundAddress: `acme-${suffix}@mail.localhost`,
      widgetKey: `wk_inbound_${suffix}`,
    });
    workspaceId = workspace.id;
    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 0,
    });
  });

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  });

  it("creates a ticket for a new thread and ignores duplicates", async () => {
    const payload = loadFixture("new-thread.json");
    payload.To = `acme-${suffix}@mail.localhost`;
    payload.OriginalRecipient = `acme-${suffix}@mail.localhost`;
    payload.MessageID = `pm-new-${suffix}`;

    const inbound = await systemDb.orm.public.InboundEmail.create({
      providerMessageId: String(payload.MessageID),
      payload: JSON.parse(JSON.stringify(payload)),
      status: "RECEIVED",
    });

    const first = await processEmailInbound({ inboundEmailId: inbound.id });
    expect(first).toMatchObject({ duplicate: false });

    const tickets = await withTenantDb({ workspaceId }, async (tx) =>
      tx.orm.public.Ticket.where({ workspaceId }).all(),
    );
    expect(tickets).toHaveLength(1);

    const messages = await withTenantDb({ workspaceId }, async (tx) =>
      tx.orm.public.Message.where({ workspaceId }).all(),
    );
    expect(messages).toHaveLength(1);

    await systemDb.orm.public.InboundEmail.where({ id: inbound.id }).update({
      status: "RECEIVED",
      error: null,
    });
    const second = await processEmailInbound({ inboundEmailId: inbound.id });
    expect(second).toMatchObject({ duplicate: true });

    const messagesAfter = await withTenantDb({ workspaceId }, async (tx) =>
      tx.orm.public.Message.where({ workspaceId }).all(),
    );
    expect(messagesAfter).toHaveLength(1);
  });

  it("stores allowed inbound attachments", async () => {
    const payload = loadFixture("with-attachment.json");
    payload.To = `acme-${suffix}@mail.localhost`;
    payload.OriginalRecipient = `acme-${suffix}@mail.localhost`;
    payload.MessageID = `pm-attach-${suffix}`;
    (payload.Headers as { Name: string; Value: string }[])[0] = {
      Name: "Message-ID",
      Value: `<attach-${suffix}@example.com>`,
    };

    const inbound = await systemDb.orm.public.InboundEmail.create({
      providerMessageId: String(payload.MessageID),
      payload: JSON.parse(JSON.stringify(payload)),
      status: "RECEIVED",
    });

    await processEmailInbound({ inboundEmailId: inbound.id });

    const attachments = await withTenantDb({ workspaceId }, async (tx) =>
      tx.orm.public.Attachment.where({ workspaceId }).all(),
    );
    expect(attachments.some((row) => row.filename === "error.png")).toBe(true);
  });
});
