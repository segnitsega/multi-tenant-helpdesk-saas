import { readFile } from "node:fs/promises";
import path from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const user = process.env.POSTMARK_INBOUND_USER ?? "";
const pass = process.env.POSTMARK_INBOUND_PASS ?? "";

const fixturesDir = path.resolve("tests/fixtures/postmark");
const names = [
  "new-thread.json",
  "reply.json",
  "auto-reply.json",
  "with-attachment.json",
  "duplicate.json",
];

async function postFixture(name: string) {
  const raw = await readFile(path.join(fixturesDir, name), "utf8");
  const payload = JSON.parse(raw) as Record<string, unknown>;

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
  console.log(`${name} → ${response.status} ${body}`);
}

async function main() {
  const only = process.argv[2];
  const selected = only
    ? names.filter((name) => name.startsWith(only) || name.includes(only))
    : names;

  if (selected.length === 0) {
    console.error(`No fixtures matched "${only}"`);
    process.exit(1);
  }

  for (const name of selected) {
    await postFixture(name);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
