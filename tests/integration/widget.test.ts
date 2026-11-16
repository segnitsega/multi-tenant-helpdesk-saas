import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import { ForbiddenError } from "@/lib/api-error";
import { RateLimitError } from "@/server/rate-limit";

vi.mock("@/lib/realtime-publish", () => ({
  publishTicketUpdated: vi.fn(async () => undefined),
  publishTicketCreated: vi.fn(async () => undefined),
  publishMessageCreated: vi.fn(async () => undefined),
}));

vi.mock("@/server/jobs/queues", () => ({
  enqueueAutomation: vi.fn(async () => undefined),
  enqueueEmailOutbound: vi.fn(async () => undefined),
}));

const {
  assertWidgetPublicAccess,
  startWidgetConversation,
  upsertWidgetSettings,
} = await import("@/server/services/widget.service");

describe("widget public access", () => {
  const suffix = randomUUID().slice(0, 8);
  let workspaceId: string;
  let widgetKey: string;

  beforeAll(async () => {
    const workspace = await systemDb.orm.public.Workspace.create({
      name: `Widget ${suffix}`,
      slug: `widget-${suffix}`,
      inboundAddress: `widget-${suffix}@mail.localhost`,
      widgetKey: `wk_widget_${suffix}`,
      plan: "PRO",
      subscriptionStatus: "active",
    });
    workspaceId = workspace.id;
    widgetKey = workspace.widgetKey;
    await systemDb.orm.public.WorkspaceCounter.create({
      workspaceId,
      ticketSeq: 0,
    });
    await upsertWidgetSettings(
      { workspaceId },
      {
        color: "#0ea5e9",
        greeting: "Hello there",
        allowedOrigins: ["https://shop.example"],
        showPoweredBy: true,
      },
    );
  }, 90_000);

  afterAll(async () => {
    try {
      if (workspaceId) {
        await systemDb.orm.public.Workspace.where({ id: workspaceId }).delete();
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  }, 60_000);

  it("enforces origin allowlist and creates WIDGET tickets", async () => {
    await expect(
      assertWidgetPublicAccess({
        widgetKey,
        origin: "https://evil.example",
        ip: "1.1.1.1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await assertWidgetPublicAccess({
      widgetKey,
      origin: "https://shop.example",
      ip: "1.1.1.1",
    });

    const started = await startWidgetConversation({
      widgetKey,
      origin: "https://shop.example",
      ip: "1.1.1.1",
      data: {
        name: "Visitor",
        email: `visitor-${suffix}@example.com`,
        message: "I need sizing help",
        honeypot: "",
      },
    });

    const ticket = await systemDb.orm.public.Ticket.where({
      id: started.ticketId,
    }).first();
    expect(ticket?.channel).toBe("WIDGET");
    expect(started.ticketNumber).toBeGreaterThan(0);
  }, 90_000);

  it("rate limits aggressive widget traffic", async () => {
    const ip = `9.9.9.${suffix.slice(0, 2)}`;
    let hitLimit = false;
    for (let i = 0; i < 70; i += 1) {
      try {
        await assertWidgetPublicAccess({
          widgetKey,
          origin: "https://shop.example",
          ip,
        });
      } catch (error) {
        if (error instanceof RateLimitError) {
          hitLimit = true;
          break;
        }
        throw error;
      }
    }
    expect(hitLimit).toBe(true);
  }, 90_000);
});
