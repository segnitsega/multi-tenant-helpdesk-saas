import { NextResponse } from "next/server";
import { constructStripeEvent } from "@/server/billing/stripe";
import { processStripeEvent } from "@/server/billing/webhook-handlers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const payload = await request.text();

  let event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    const result = await processStripeEvent(event);
    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    console.error("stripe webhook failed", error);
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
