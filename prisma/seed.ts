import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { hashPassword } from "../src/server/auth/password";
import { systemDb } from "../src/server/db/system";
import { createWorkspace } from "../src/server/services/workspace.service";
import { createTicket, updateTicket } from "../src/server/services/ticket.service";
import { addNote, addReply } from "../src/server/services/message.service";
import type { TenantContext } from "../src/types/tenant";

async function main() {
  const email = "demo@relay.local";
  const passwordHash = await hashPassword("password123");

  let user = await systemDb.orm.public.User.where({ email }).first();
  if (!user) {
    user = await systemDb.orm.public.User.create({
      email,
      name: "Demo Owner",
      passwordHash,
    });
  }

  let workspace = await systemDb.orm.public.Workspace.where({
    slug: "demo",
  }).first();
  let membershipId: string;

  if (!workspace) {
    const created = await createWorkspace(user.id, {
      name: "Demo Workspace",
      slug: "demo",
    });
    workspace = created.workspace;
    membershipId = created.membership.id;
  } else {
    const membership = await systemDb.orm.public.Membership.where({
      workspaceId: workspace.id,
      userId: user.id,
    }).first();
    if (!membership) {
      throw new Error("Demo workspace exists without owner membership");
    }
    membershipId = membership.id;
  }

  const ctx: TenantContext = {
    userId: user.id,
    workspaceId: workspace.id,
    membershipId,
    role: "OWNER",
    readonly: false,
    slug: workspace.slug,
  };

  const ticket = await createTicket(ctx, {
    subject: "Welcome to Relay",
    bodyHtml: "<p>Hi — can you help me get started?</p>",
    customerEmail: "ana@example.com",
    customerName: "Ana Rivera",
    priority: "NORMAL",
    channel: "MANUAL",
  });

  await addNote(ctx, {
    ticketNumber: ticket.number,
    bodyHtml: "<p>Customer is evaluating the product.</p>",
  });

  await addReply(ctx, {
    ticketNumber: ticket.number,
    bodyHtml: "<p>Happy to help — here is a quick tour.</p>",
  });

  await updateTicket(ctx, ticket.number, { status: "PENDING" });

  console.log(
    JSON.stringify(
      {
        email,
        password: "password123",
        workspace: workspace.slug,
        ticketNumber: ticket.number,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await systemDb.close();
  });
