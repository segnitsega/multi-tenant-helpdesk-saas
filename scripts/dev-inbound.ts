/**
 * Simulate production Postmark inbound locally.
 *
 * Production: Postmark POSTs to /api/webhooks/postmark/inbound
 * Local: this script POSTs the same payload shape to that route.
 *
 * Usage:
 *   pnpm dev:inbound                  # new-thread → demo workspace
 *   pnpm dev:inbound new-thread
 *   pnpm dev:inbound --slug demo new-thread
 *   INBOUND_SLUG=demo pnpm dev:inbound new-thread
 *
 * Requires: `pnpm dev` (webhook) + `pnpm dev:worker` (ticket creation) + Redis.
 */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const MAIL_DOMAIN = process.env.MAIL_DOMAIN ?? "mail.localhost";
const user = process.env.POSTMARK_INBOUND_USER ?? "";
const pass = process.env.POSTMARK_INBOUND_PASS ?? "";

const fixturesDir = path.resolve("tests/fixtures/postmark");
const defaultNames = ["new-thread.json"] as const;
const allNames = [
  "new-thread.json",
  "reply.json",
  "auto-reply.json",
  "with-attachment.json",
  "duplicate.json",
] as const;

function parseArgs(argv: string[]) {
  let slug = process.env.INBOUND_SLUG ?? "demo";
  const filters: string[] = [];
  let all = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--slug") {
      slug = argv[++i] ?? slug;
      continue;
    }
    if (arg === "--all") {
      all = true;
      continue;
    }
    filters.push(arg);
  }

  return { slug, filters, all };
}

function rewriteRecipient(
  payload: Record<string, unknown>,
  inboundAddress: string,
) {
  payload.To = inboundAddress;
  payload.OriginalRecipient = inboundAddress;
  payload.ToFull = [
    {
      Email: inboundAddress,
      Name: "",
      MailboxHash: "",
    },
  ];
  payload.MailboxHash = "";
}

function uniquifyIds(payload: Record<string, unknown>) {
  const id = `pm-dev-${randomUUID()}`;
  payload.MessageID = id;

  const headers = Array.isArray(payload.Headers)
    ? [...(payload.Headers as Array<{ Name: string; Value: string }>)]
    : [];
  const messageIdHeader = `<${id}@${MAIL_DOMAIN}>`;
  const withoutMessageId = headers.filter(
    (h) => h.Name.toLowerCase() !== "message-id",
  );
  payload.Headers = [
    { Name: "Message-ID", Value: messageIdHeader },
    ...withoutMessageId,
  ];
}

async function postFixture(name: string, inboundAddress: string) {
  const raw = await readFile(path.join(fixturesDir, name), "utf8");
  const payload = JSON.parse(raw) as Record<string, unknown>;

  rewriteRecipient(payload, inboundAddress);
  // Keep duplicate.json stable so the webhook can return duplicate:true.
  if (name !== "duplicate.json") {
    uniquifyIds(payload);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
  }

  const response = await fetch(`${APP_URL}/api/webhooks/postmark/inbound`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  console.log(`${name} → ${inboundAddress} → ${response.status} ${body}`);
  return response.ok;
}

async function main() {
  const { slug, filters, all } = parseArgs(process.argv.slice(2));
  const inboundAddress = `${slug}@${MAIL_DOMAIN}`;

  const pool = all ? allNames : defaultNames;
  const selected =
    filters.length === 0
      ? [...pool]
      : allNames.filter((name) =>
          filters.some((f) => name.startsWith(f) || name.includes(f)),
        );

  if (selected.length === 0) {
    console.error(`No fixtures matched ${JSON.stringify(filters)}`);
    process.exit(1);
  }

  console.log(
    `Posting ${selected.length} fixture(s) as production inbound to ${inboundAddress}`,
  );

  let failed = false;
  for (const name of selected) {
    const ok = await postFixture(name, inboundAddress);
    if (!ok) failed = true;
  }

  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
