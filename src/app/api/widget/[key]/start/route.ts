import { NextResponse } from "next/server";
import { widgetPrechatSchema } from "@/lib/validators/widget";
import { startWidgetConversation } from "@/server/services/widget.service";
import { setCustomerSession } from "@/server/auth/customer-session";
import { toApiError, toFieldErrors } from "@/lib/api-error";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const body = await request.json();
    const parsed = widgetPrechatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Check the form.",
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

    const result = await startWidgetConversation({
      widgetKey: key,
      origin,
      ip,
      data: parsed.data,
    });

    await setCustomerSession({
      customerId: result.customerId,
      workspaceId: result.workspaceId,
      kind: "widget",
    });

    return NextResponse.json({
      ok: true,
      ticketNumber: result.ticketNumber,
      message: {
        id: result.message.id,
        bodyText: result.message.bodyText,
        createdAt: result.message.createdAt,
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
