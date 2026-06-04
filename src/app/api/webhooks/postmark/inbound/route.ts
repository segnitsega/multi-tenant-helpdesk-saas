import { NextResponse } from "next/server";
import { systemDb } from "@/server/db/system";
import { env } from "@/server/env";
import { enqueueEmailInbound } from "@/server/jobs/queues";
import { parsePostmarkInbound } from "@/server/email/inbound/parse";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="postmark-inbound"' },
  });
}

function verifyBasicAuth(request: Request): boolean {
  const user = env.POSTMARK_INBOUND_USER;
  const pass = env.POSTMARK_INBOUND_PASS;
  if (!user || !pass) {
    return env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [providedUser, ...rest] = decoded.split(":");
  const providedPass = rest.join(":");
  return providedUser === user && providedPass === pass;
}

export async function POST(request: Request) {
  if (!verifyBasicAuth(request)) {
    return unauthorized();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  let providerMessageId: string;
  try {
    providerMessageId = parsePostmarkInbound(payload).providerMessageId;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid Postmark payload" },
      { status: 400 },
    );
  }

  const existing = await systemDb.orm.public.InboundEmail.where({
    providerMessageId,
  }).first();
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const jsonPayload = JSON.parse(JSON.stringify(payload));
  const inbound = await systemDb.orm.public.InboundEmail.create({
    providerMessageId,
    payload: jsonPayload,
    status: "RECEIVED",
  });

  await enqueueEmailInbound(inbound.id, providerMessageId);
  return NextResponse.json({ ok: true, id: inbound.id });
}
