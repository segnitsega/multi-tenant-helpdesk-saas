import { NextResponse } from "next/server";
import {
  assertWidgetPublicAccess,
  getWidgetSettings,
  getWorkspaceByWidgetKey,
} from "@/server/services/widget.service";
import { toApiError } from "@/lib/api-error";
import { env } from "@/server/env";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const origin = request.headers.get("origin");
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";
    const { workspace, settings } = await assertWidgetPublicAccess({
      widgetKey: key,
      origin,
      ip,
    });

    return NextResponse.json({
      ok: true,
      workspace: {
        name: workspace.name,
        widgetKey: workspace.widgetKey,
      },
      settings: {
        color: settings.color,
        greeting: settings.greeting,
        showPoweredBy: settings.showPoweredBy,
      },
      iframeUrl: `${env.APP_URL}/widget/${encodeURIComponent(key)}`,
    });
  } catch (error) {
    const shape = toApiError(error);
    const status = shape.code === "FORBIDDEN" ? 403 : shape.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ ok: false, error: shape }, { status });
  }
}

export async function OPTIONS(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  try {
    const workspace = await getWorkspaceByWidgetKey(key);
    const settings = await getWidgetSettings(workspace.id);
    const origin = request.headers.get("origin");
    const allow =
      !origin ||
      settings.allowedOrigins.length === 0 ||
      settings.allowedOrigins.includes("*") ||
      settings.allowedOrigins.includes(origin)
        ? origin ?? "*"
        : "null";
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
