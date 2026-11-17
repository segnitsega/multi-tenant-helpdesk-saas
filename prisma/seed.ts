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
import { seedEmailShowcase } from "./seed-email-showcase";
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

  const viewer = await ensureUser("viewer@relay.local", "Demo Viewer");
  const viewerMembership = await systemDb.orm.public.Membership.where({
    workspaceId: workspace.id,
    userId: viewer.id,
  }).first();
  if (!viewerMembership) {
    await systemDb.orm.public.Membership.create({
      workspaceId: workspace.id,
      userId: viewer.id,
      role: "AGENT",
      readonly: true,
    });
  } else if (!viewerMembership.readonly) {
    await systemDb.orm.public.Membership.where({
      id: viewerMembership.id,
    }).update({ readonly: true });
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
  const TARGET = 100;

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

      const channel =
        n % 3 === 0 ? "WIDGET" : n % 2 === 0 ? "EMAIL" : ("MANUAL" as const);
      const emailSubjects = [
        "Order never arrived",
        "Invoice PDF missing",
        "Update billing email",
        "Cancel renewal",
        "Wrong item shipped",
      ] as const;
      const subject =
        channel === "EMAIL"
          ? `${emailSubjects[n % emailSubjects.length]} (#${1000 + n})`
          : `Seed ticket ${n}: ${priority.toLowerCase()} issue`;

      const ticket = await createTicket(ctx, {
        subject,
        bodyHtml:
          channel === "EMAIL"
            ? `<p>Hello support,</p><p>I’m writing about order <strong>#${1000 + n}</strong>. ${emailSubjects[n % emailSubjects.length]} — please advise.</p><p>Thanks,<br/>Customer ${(n % 30) + 1}</p>`
            : `<p>Customer message for ticket ${n}. Need help with order #${1000 + n}.</p>`,
        customerEmail: `customer${(n % 30) + 1}@example.com`,
        customerName: `Customer ${(n % 30) + 1}`,
        priority,
        channel,
        assigneeMembershipId: assignee,
      });

      if (channel === "EMAIL") {
        const messages = await systemDb.orm.public.Message.where({
          ticketId: ticket.id,
        }).all();
        const first = messages[0];
        if (first) {
          await systemDb.orm.public.Message.where({ id: first.id }).update({
            emailMessageId: `<cust.seed.${n}@${process.env.MAIL_DOMAIN ?? "mail.localhost"}>`,
          });
        }
      }

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

  const emailShowcase = await seedEmailShowcase(ctx, {
    workspaceId: workspace.id,
    inboundAddress:
      workspace.inboundAddress ?? `demo@${process.env.MAIL_DOMAIN ?? "mail.localhost"}`,
    agentMembershipIds: memberships
      .filter((m) => m.userId !== owner.id && !m.readonly)
      .map((m) => m.id),
  });

  console.log(
    JSON.stringify(
      {
        login: {
          email: "demo@relay.local",
          password: "password123",
        },
        readonlyDemo: {
          email: "viewer@relay.local",
          password: "password123",
          path: "/demo",
        },
        workspace: "demo",
        agents: agents.map((a) => a.email),
        ticketTarget: TARGET,
        historyDays: HISTORY_DAYS,
        emailShowcase,
        emailLocal: {
          inboundAddress: workspace.inboundAddress,
          simulateInbound: "pnpm dev:inbound new-thread",
          mailpit: "http://localhost:8025",
        },
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
  .finally(() => {
    void systemDb.close().finally(() => process.exit(process.exitCode ?? 0));
  });
