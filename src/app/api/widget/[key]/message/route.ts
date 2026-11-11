import { NextResponse } from "next/server";
import { widgetReplySchema } from "@/lib/validators/widget";
import { addWidgetReply } from "@/server/services/widget.service";
import { getCustomerSession } from "@/server/auth/customer-session";
import { toApiError, toFieldErrors } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(
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

    const body = await request.json();
    const parsed = widgetReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Check your message.",
            fieldErrors: toFieldErrors(parsed.error),
          },
        },
        { status: 400 },
      );
    }

    const origin = request.headers.get("origin");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const message = await addWidgetReply({
      widgetKey: key,
      origin,
      ip,
      customerId: session.customerId,
      data: parsed.data,
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        bodyText: message.bodyText,
        createdAt: message.createdAt,
      },
    });
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
