import { systemDb } from "../src/server/db/system";
import { createTicket, updateTicket } from "../src/server/services/ticket.service";
import { addNote } from "../src/server/services/message.service";
import type { TenantContext } from "../src/types/tenant";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? "mail.localhost";

type ShowcaseThread = {
  key: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "PENDING" | "ON_HOLD" | "RESOLVED" | "CLOSED";
  customerOpen: string;
  agentReply: string;
  customerFollowUp?: string;
  agentClose?: string;
  note?: string;
};

const THREADS: ShowcaseThread[] = [
  {
    key: "billing-double-charge",
    subject: "Charged twice for order #4821",
    customerEmail: "ava.chen@example.com",
    customerName: "Ava Chen",
    priority: "HIGH",
    status: "PENDING",
    customerOpen:
      "<p>Hi team — I was charged twice for order <strong>#4821</strong>. Can you refund the duplicate?</p>",
    agentReply:
      "<p>Hi Ava,</p><p>Thanks for flagging this. I can see the duplicate charge and I’ve queued a refund. You’ll see it on your statement in 3–5 business days.</p><p>— Sam</p>",
    customerFollowUp: "<p>Perfect, thanks! Please confirm when it posts.</p>",
    note: "<p>Refund ticket opened with finance. Waiting on processor confirmation.</p>",
  },
  {
    key: "password-reset",
    subject: "Can't reset my password",
    customerEmail: "noah.patel@example.com",
    customerName: "Noah Patel",
    priority: "NORMAL",
    status: "RESOLVED",
    customerOpen:
      "<p>The reset link in my email says it’s expired. I’ve tried twice.</p>",
    agentReply:
      "<p>Hi Noah,</p><p>I’ve invalidated the old tokens and sent a fresh reset link to this address. It expires in one hour.</p><p>— Riley</p>",
    customerFollowUp: "<p>That worked — I’m back in. Thanks!</p>",
    agentClose:
      "<p>Glad you’re in. I’m marking this resolved. Reply anytime if you need more help.</p><p>— Riley</p>",
  },
  {
    key: "api-rate-limit",
    subject: "API rate limit spike on /v1/orders",
    customerEmail: "jordan.lee@example.com",
    customerName: "Jordan Lee",
    priority: "URGENT",
    status: "OPEN",
    customerOpen:
      "<p>We’re getting <code>429</code> responses since ~09:40 UTC. Traffic didn’t change on our side.</p>",
    agentReply:
      "<p>Hi Jordan,</p><p>We’ve reproduced the spike and are checking the edge rate-limiter config. I’ll update you within the hour.</p><p>— Jordan</p>",
    note: "<p>Suspected shared bucket with another tenant — escalated to infra.</p>",
  },
  {
    key: "shipping-delay",
    subject: "Shipment still in transit after 12 days",
    customerEmail: "mia.ross@example.com",
    customerName: "Mia Ross",
    priority: "NORMAL",
    status: "ON_HOLD",
    customerOpen:
      "<p>Tracking for package <strong>RX-99201</strong> hasn’t moved since last Tuesday.</p>",
    agentReply:
      "<p>Hi Mia,</p><p>I’ve opened a carrier investigation. I’ll pause this ticket until we hear back (usually 24–48h).</p><p>— Sam</p>",
  },
  {
    key: "feature-question",
    subject: "Do you support SAML SSO on Pro?",
    customerEmail: "chris.nguyen@example.com",
    customerName: "Chris Nguyen",
    priority: "LOW",
    status: "CLOSED",
    customerOpen:
      "<p>Evaluating Relay for our support team — is SAML available on Pro or only Business?</p>",
    agentReply:
      "<p>Hi Chris,</p><p>SAML SSO is on the Business plan. Happy to walk you through a trial if useful.</p><p>— Demo Owner</p>",
    agentClose:
      "<p>Closing for now — reply if you’d like a Business walkthrough.</p>",
  },
];

const CANNED = [
  {
    title: "Refund acknowledgment",
    shortcut: "refund",
    bodyHtml:
      "<p>Hi {{customer.name}},</p><p>I’ve confirmed the duplicate charge on ticket #{{ticket.number}} and queued a refund. It typically posts in 3–5 business days.</p><p>— {{agent.name}}</p>",
  },
  {
    title: "Password reset help",
    shortcut: "reset",
    bodyHtml:
      "<p>Hi {{customer.name}},</p><p>I’ve sent a fresh password reset link to this email. It expires in one hour — let me know if you still hit issues.</p><p>— {{agent.name}}</p>",
  },
  {
    title: "Waiting on carrier",
    shortcut: "carrier",
    bodyHtml:
      "<p>Hi {{customer.name}},</p><p>We’ve opened a carrier investigation for your shipment. I’ll update ticket #{{ticket.number}} as soon as we hear back.</p><p>— {{agent.name}}</p>",
  },
];

const AUTOMATIONS = [
  {
    name: "Urgent when subject mentions refund",
    trigger: "ticket.created",
    conditions: {
      mode: "any" as const,
      conditions: [
        { field: "subject", op: "contains", value: "refund" },
        { field: "subject", op: "contains", value: "charged twice" },
      ],
    },
    actions: [
      { type: "set_priority", value: "HIGH" },
      { type: "add_tag", tagName: "billing" },
    ],
  },
  {
    name: "Round-robin assign email tickets",
    trigger: "ticket.created",
    conditions: {
      mode: "all" as const,
      conditions: [{ field: "channel", op: "equals", value: "EMAIL" }],
    },
    actions: [{ type: "assign", strategy: "round_robin" as const }],
  },
];

function inboundPayload(opts: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  messageId: string;
}) {
  return {
    From: opts.from,
    FromName: opts.fromName,
    FromFull: { Email: opts.from, Name: opts.fromName, MailboxHash: "" },
    To: opts.to,
    ToFull: [{ Email: opts.to, Name: "", MailboxHash: "" }],
    OriginalRecipient: opts.to,
    Subject: opts.subject,
    MessageID: opts.messageId,
    MailboxHash: "",
    Date: new Date().toUTCString(),
    TextBody: opts.text,
    HtmlBody: `<p>${opts.text}</p>`,
    StrippedTextReply: "",
    Headers: [{ Name: "Message-ID", Value: `<${opts.messageId}>` }],
    Attachments: [],
  };
}

export async function seedEmailShowcase(
  ctx: TenantContext,
  opts: {
    workspaceId: string;
    inboundAddress: string;
    agentMembershipIds: string[];
  },
) {
  const { workspaceId, inboundAddress, agentMembershipIds } = opts;

  for (const reply of CANNED) {
    const existing = await systemDb.orm.public.CannedReply.where({
      workspaceId,
    }).all();
    if (existing.some((row) => row.title === reply.title)) continue;
    await systemDb.orm.public.CannedReply.create({
      workspaceId,
      title: reply.title,
      shortcut: reply.shortcut,
      bodyHtml: reply.bodyHtml,
    });
  }

  const existingRules = await systemDb.orm.public.AutomationRule.where({
    workspaceId,
  }).all();
  let position = existingRules.length;
  for (const rule of AUTOMATIONS) {
    if (existingRules.some((row) => row.name === rule.name)) continue;
    await systemDb.orm.public.AutomationRule.create({
      workspaceId,
      name: rule.name,
      trigger: rule.trigger,
      conditions: rule.conditions,
      actions: rule.actions,
      enabled: true,
      position: position++,
    });
  }

  for (const [index, thread] of THREADS.entries()) {
    const customers = await systemDb.orm.public.Customer.where({
      workspaceId,
      email: thread.customerEmail,
    }).all();
    const customerIds = new Set(customers.map((c) => c.id));
    const allTickets = await systemDb.orm.public.Ticket.where({
      workspaceId,
    }).all();
    if (
      allTickets.some(
        (t) => t.subject === thread.subject && customerIds.has(t.customerId),
      )
    ) {
      continue;
    }

    const assignee =
      agentMembershipIds[index % agentMembershipIds.length] ?? null;
    const ticket = await createTicket(ctx, {
      subject: thread.subject,
      bodyHtml: thread.customerOpen,
      customerEmail: thread.customerEmail,
      customerName: thread.customerName,
      priority: thread.priority,
      channel: "EMAIL",
      assigneeMembershipId: assignee,
    });

    const customerMsgId = `<cust.${thread.key}.1@${MAIL_DOMAIN}>`;
    const agentMsgId = `<relay.${thread.key}.1@${MAIL_DOMAIN}>`;

    const messages = await systemDb.orm.public.Message.where({
      ticketId: ticket.id,
    }).all();
    const first = messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0];
    if (first) {
      await systemDb.orm.public.Message.where({ id: first.id }).update({
        emailMessageId: customerMsgId,
        deliveryStatus: null,
      });
    }

    const agentMembershipId =
      assignee ?? ctx.membershipId;
    const agentReply = await systemDb.orm.public.Message.create({
      workspaceId,
      ticketId: ticket.id,
      authorType: "AGENT",
      authorMembershipId: agentMembershipId,
      kind: "REPLY",
      bodyHtml: thread.agentReply,
      bodyText: thread.agentReply.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      emailMessageId: agentMsgId,
      inReplyTo: customerMsgId,
      deliveryStatus: "SENT",
    });

    if (thread.note) {
      await addNote(ctx, {
        ticketNumber: ticket.number,
        bodyHtml: thread.note,
      });
    }

    let lastEmailId = agentMsgId;

    if (thread.customerFollowUp) {
      const followId = `<cust.${thread.key}.2@${MAIL_DOMAIN}>`;
      const customer = await systemDb.orm.public.Customer.where({
        workspaceId,
        email: thread.customerEmail,
      }).first();
      await systemDb.orm.public.Message.create({
        workspaceId,
        ticketId: ticket.id,
        authorType: "CUSTOMER",
        authorCustomerId: customer!.id,
        kind: "REPLY",
        bodyHtml: thread.customerFollowUp,
        bodyText: thread.customerFollowUp
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        emailMessageId: followId,
        inReplyTo: agentMsgId,
        deliveryStatus: null,
      });
      lastEmailId = followId;
    }

    if (thread.agentClose) {
      const closeId = `<relay.${thread.key}.2@${MAIL_DOMAIN}>`;
      await systemDb.orm.public.Message.create({
        workspaceId,
        ticketId: ticket.id,
        authorType: "AGENT",
        authorMembershipId: agentMembershipId,
        kind: "REPLY",
        bodyHtml: thread.agentClose,
        bodyText: thread.agentClose
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        emailMessageId: closeId,
        inReplyTo: lastEmailId,
        deliveryStatus: "SENT",
      });
    }

    const now = new Date();
    await systemDb.orm.public.Ticket.where({ id: ticket.id }).update({
      lastMessageAt: now,
      lastCustomerMessageAt: thread.customerFollowUp ? now : ticket.createdAt,
      firstResponseAt: agentReply.createdAt,
    });

    if (thread.status !== "OPEN") {
      await updateTicket(ctx, ticket.number, { status: thread.status });
    }
  }

  const inboundSeeds = [
    {
      providerMessageId: "seed-inbound-processed-billing",
      status: "PROCESSED",
      error: null as string | null,
      subject: "Charged twice for order #4821",
      from: "ava.chen@example.com",
      fromName: "Ava Chen",
      text: "Hi team — I was charged twice for order #4821.",
    },
    {
      providerMessageId: "seed-inbound-processed-password",
      status: "PROCESSED",
      error: null,
      subject: "Can't reset my password",
      from: "noah.patel@example.com",
      fromName: "Noah Patel",
      text: "The reset link in my email says it’s expired.",
    },
    {
      providerMessageId: "seed-inbound-failed-parse",
      status: "FAILED",
      error: "Attachment exceeded size limit (demo failure for Replay)",
      subject: "Screenshot of the error",
      from: "ops@example.com",
      fromName: "Ops Example",
      text: "See attached — large screenshot for demos.",
    },
    {
      providerMessageId: "seed-inbound-processed-api",
      status: "PROCESSED",
      error: null,
      subject: "API rate limit spike on /v1/orders",
      from: "jordan.lee@example.com",
      fromName: "Jordan Lee",
      text: "We’re getting 429 responses since ~09:40 UTC.",
    },
  ];

  for (const row of inboundSeeds) {
    const existing = await systemDb.orm.public.InboundEmail.where({
      providerMessageId: row.providerMessageId,
    }).first();
    if (existing) continue;
    await systemDb.orm.public.InboundEmail.create({
      workspaceId,
      providerMessageId: row.providerMessageId,
      status: row.status,
      error: row.error,
      payload: inboundPayload({
        from: row.from,
        fromName: row.fromName,
        to: inboundAddress,
        subject: row.subject,
        text: row.text,
        messageId: row.providerMessageId,
      }),
    });
  }

  return {
    showcaseThreads: THREADS.length,
    cannedReplies: CANNED.length,
    automations: AUTOMATIONS.length,
    inboundRows: inboundSeeds.length,
  };
}
