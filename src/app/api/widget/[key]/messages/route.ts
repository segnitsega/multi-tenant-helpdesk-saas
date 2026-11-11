import { NextResponse } from "next/server";
import { listWidgetMessages } from "@/server/services/widget.service";
import { getCustomerSession } from "@/server/auth/customer-session";
import { toApiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const session = await getCustomerSession("widget");
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Session required" } },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const ticketNumber = Number(url.searchParams.get("ticketNumber"));
    if (!Number.isFinite(ticketNumber) || ticketNumber < 1) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "ticketNumber required" } },
        { status: 400 },
      );
    }

    const messages = await listWidgetMessages({
      widgetKey: key,
      customerId: session.customerId,
      ticketNumber,
    });

    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    const shape = toApiError(error);
    const status =
      shape.code === "FORBIDDEN"
        ? 403
        : shape.code === "NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ ok: false, error: shape }, { status });
  }
}
