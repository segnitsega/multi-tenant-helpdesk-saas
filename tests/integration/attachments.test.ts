import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { systemDb } from "@/server/db/system";
import { db } from "@/server/db/client";
import { getAttachmentDownloadUrl } from "@/server/services/attachment.service";
import { ForbiddenError, NotFoundError } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";

type WorkspaceSeed = {
  workspaceId: string;
  ticketId: string;
  attachmentId: string;
};

async function seedWorkspace(label: string): Promise<WorkspaceSeed> {
  const suffix = randomUUID().slice(0, 8);
  const workspace = await systemDb.orm.public.Workspace.create({
    name: `Attach ${label}`,
    slug: `attach-${label}-${suffix}`,
    inboundAddress: `attach-${label}-${suffix}@mail.localhost`,
    widgetKey: `wk_attach_${label}_${suffix}`,
  });

  await systemDb.orm.public.WorkspaceCounter.create({
    workspaceId: workspace.id,
    ticketSeq: 1,
  });

  const customer = await systemDb.orm.public.Customer.create({
    workspaceId: workspace.id,
    email: `attach-${label}-${suffix}@example.com`,
    name: `Attach ${label}`,
  });

  const ticket = await systemDb.orm.public.Ticket.create({
    workspaceId: workspace.id,
    number: 1,
    customerId: customer.id,
    subject: `Attachment ticket ${label}`,
    channel: "EMAIL",
    lastMessageAt: new Date(),
  });

  const attachmentId = randomUUID();
  await systemDb.orm.public.Attachment.create({
    id: attachmentId,
    workspaceId: workspace.id,
    ticketId: ticket.id,
    storageKey: `${workspace.id}/${ticket.id}/${attachmentId}/file.png`,
    filename: "file.png",
    sizeBytes: 128,
    mimeType: "image/png",
    status: "READY",
  });

  return {
    workspaceId: workspace.id,
    ticketId: ticket.id,
    attachmentId,
  };
}

function fakeCtx(workspaceId: string, slug: string): TenantContext {
  return {
    userId: randomUUID(),
    workspaceId,
    membershipId: randomUUID(),
    role: "AGENT",
    readonly: false,
    slug,
  };
}

describe("attachment download authorization", () => {
  let a: WorkspaceSeed;
  let b: WorkspaceSeed;

  beforeAll(async () => {
    a = await seedWorkspace("a");
    b = await seedWorkspace("b");
  });

  afterAll(async () => {
    try {
      if (a?.workspaceId) {
        await systemDb.orm.public.Workspace.where({
          id: a.workspaceId,
        }).delete();
      }
      if (b?.workspaceId) {
        await systemDb.orm.public.Workspace.where({
          id: b.workspaceId,
        }).delete();
      }
    } finally {
      await systemDb.close();
      await db.close();
    }
  });

  it("refuses downloads for attachments from another workspace", async () => {
    const foreign = fakeCtx(b.workspaceId, "foreign");
    try {
      await getAttachmentDownloadUrl(foreign, a.attachmentId);
      expect.fail("expected cross-tenant download to be refused");
    } catch (error) {
      expect(
        error instanceof NotFoundError || error instanceof ForbiddenError,
      ).toBe(true);
    }
  });
});
