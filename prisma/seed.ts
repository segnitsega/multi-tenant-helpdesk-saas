import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { hashPassword } from "../src/server/auth/password";
import { systemDb } from "../src/server/db/system";
import { createWorkspace } from "../src/server/services/workspace.service";
import {
  createTicket,
  updateTicket,
} from "../src/server/services/ticket.service";
import { addNote, addReply } from "../src/server/services/message.service";
import type { TenantContext } from "../src/types/tenant";

const STATUSES = ["OPEN", "PENDING", "ON_HOLD", "RESOLVED", "CLOSED"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

async function ensureUser(email: string, name: string) {
  const passwordHash = await hashPassword("password123");
  let user = await systemDb.orm.public.User.where({ email }).first();
  if (!user) {
    user = await systemDb.orm.public.User.create({
      email,
      name,
      passwordHash,
    });
  }
  return user;
}

async function main() {
  const owner = await ensureUser("demo@relay.local", "Demo Owner");
  const agents = await Promise.all([
    ensureUser("sam@relay.local", "Sam Agent"),
    ensureUser("riley@relay.local", "Riley Agent"),
    ensureUser("jordan@relay.local", "Jordan Agent"),
  ]);

  let workspace = await systemDb.orm.public.Workspace.where({
    slug: "demo",
  }).first();
  let membershipId: string;

  if (!workspace) {
    const created = await createWorkspace(owner.id, {
      name: "Demo Workspace",
      slug: "demo",
    });
    workspace = created.workspace;
    membershipId = created.membership.id;
  } else {
    const membership = await systemDb.orm.public.Membership.where({
      workspaceId: workspace.id,
      userId: owner.id,
    }).first();
    if (!membership) {
      throw new Error("Demo workspace exists without owner membership");
    }
    membershipId = membership.id;
  }

  for (const agent of agents) {
    const existing = await systemDb.orm.public.Membership.where({
      workspaceId: workspace.id,
      userId: agent.id,
    }).first();
    if (!existing) {
      await systemDb.orm.public.Membership.create({
        workspaceId: workspace.id,
        userId: agent.id,
        role: "AGENT",
        readonly: false,
      });
    }
  }

  const memberships = await systemDb.orm.public.Membership.where({
    workspaceId: workspace.id,
  }).all();

  const ctx: TenantContext = {
    userId: owner.id,
    workspaceId: workspace.id,
    membershipId,
    role: "OWNER",
    readonly: false,
    slug: workspace.slug,
  };

  const existingTickets = await systemDb.orm.public.Ticket.where({
    workspaceId: workspace.id,
  }).all();

  if (existingTickets.length < 200) {
    const toCreate = 200 - existingTickets.length;
    for (let i = 0; i < toCreate; i++) {
      const n = existingTickets.length + i + 1;
      const priority = PRIORITIES[n % PRIORITIES.length]!;
      const status = STATUSES[n % STATUSES.length]!;
      const assignee =
        n % 4 === 0
          ? null
          : memberships[n % memberships.length]?.id ?? null;

      const ticket = await createTicket(ctx, {
        subject: `Seed ticket ${n}: ${priority.toLowerCase()} issue`,
        bodyHtml: `<p>Customer message for ticket ${n}. Need help with order #${1000 + n}.</p>`,
        customerEmail: `customer${(n % 30) + 1}@example.com`,
        customerName: `Customer ${(n % 30) + 1}`,
        priority,
        channel: n % 2 === 0 ? "EMAIL" : "MANUAL",
        assigneeMembershipId: assignee,
      });

      if (n % 3 === 0) {
        await addNote(ctx, {
          ticketNumber: ticket.number,
          bodyHtml: `<p>Internal note on seed ticket ${n}.</p>`,
        });
      }
      if (n % 2 === 0) {
        await addReply(ctx, {
          ticketNumber: ticket.number,
          bodyHtml: `<p>Thanks for reaching out about ticket ${n} — we are looking into this.</p>`,
        });
      }
      if (status !== "OPEN") {
        await updateTicket(ctx, ticket.number, { status });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        login: {
          email: "demo@relay.local",
          password: "password123",
        },
        workspace: "demo",
        agents: agents.map((a) => a.email),
        ticketTarget: 200,
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
