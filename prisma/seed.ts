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

  await systemDb.orm.public.Workspace.where({ id: workspace.id }).update({
    plan: "PRO",
    subscriptionStatus: "active",
    timezone: "UTC",
  });

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

  const HISTORY_DAYS = 45;
  const TARGET = 220;

  if (existingTickets.length < TARGET) {
    const toCreate = TARGET - existingTickets.length;
    for (let i = 0; i < toCreate; i++) {
      const n = existingTickets.length + i + 1;
      const priority = PRIORITIES[n % PRIORITIES.length]!;
      const status = STATUSES[n % STATUSES.length]!;
      const assignee =
        n % 4 === 0
          ? null
          : memberships[n % memberships.length]?.id ?? null;
      const dayOffset = n % HISTORY_DAYS;
      const createdAt = new Date(
        Date.now() - dayOffset * 86_400_000 - (n % 14) * 3_600_000,
      );
      const firstResponseAt =
        n % 5 === 0
          ? null
          : new Date(createdAt.getTime() + ((n % 7) + 1) * 15 * 60_000);
      const resolvedAt =
        status === "RESOLVED" || status === "CLOSED"
          ? new Date(createdAt.getTime() + ((n % 11) + 2) * 60 * 60_000)
          : null;

      const ticket = await createTicket(ctx, {
        subject: `Seed ticket ${n}: ${priority.toLowerCase()} issue`,
        bodyHtml: `<p>Customer message for ticket ${n}. Need help with order #${1000 + n}.</p>`,
        customerEmail: `customer${(n % 30) + 1}@example.com`,
        customerName: `Customer ${(n % 30) + 1}`,
        priority,
        channel: n % 3 === 0 ? "WIDGET" : n % 2 === 0 ? "EMAIL" : "MANUAL",
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

      await systemDb.orm.public.Ticket.where({ id: ticket.id }).update({
        createdAt,
        lastMessageAt: firstResponseAt ?? createdAt,
        lastCustomerMessageAt: createdAt,
        firstResponseAt,
        resolvedAt,
        closedAt: status === "CLOSED" ? resolvedAt : null,
        slaFirstResponseDueAt: new Date(createdAt.getTime() + 2 * 60 * 60_000),
        slaResolutionDueAt: new Date(createdAt.getTime() + 24 * 60 * 60_000),
        slaFirstResponseBreached: Boolean(
          firstResponseAt &&
            firstResponseAt.getTime() > createdAt.getTime() + 2 * 60 * 60_000,
        ),
        slaResolutionBreached: Boolean(
          resolvedAt &&
            resolvedAt.getTime() > createdAt.getTime() + 24 * 60 * 60_000,
        ),
      });
    }
  } else {
    for (const [index, ticket] of existingTickets.entries()) {
      if (index >= HISTORY_DAYS * 4) break;
      const dayOffset = index % HISTORY_DAYS;
      const createdAt = new Date(
        Date.now() - dayOffset * 86_400_000 - (index % 9) * 3_600_000,
      );
      const firstResponseAt = ticket.firstResponseAt
        ? new Date(createdAt.getTime() + 45 * 60_000)
        : null;
      const resolvedAt = ticket.resolvedAt
        ? new Date(createdAt.getTime() + 5 * 60 * 60_000)
        : null;
      await systemDb.orm.public.Ticket.where({ id: ticket.id }).update({
        createdAt,
        lastMessageAt: firstResponseAt ?? createdAt,
        firstResponseAt,
        resolvedAt,
      });
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
        ticketTarget: TARGET,
        historyDays: HISTORY_DAYS,
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
