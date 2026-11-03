import { NextResponse } from "next/server";
import { requireApiTenant } from "@/server/tenancy/api-context";
import { assertCan } from "@/server/tenancy/permissions";
import {
  analyticsDashboardToCsv,
  getAnalyticsDashboard,
} from "@/server/services/analytics.service";
import { ForbiddenError, toApiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const ctx = await requireApiTenant(slug);
    assertCan(ctx, "ticket.view");

    const url = new URL(request.url);
    const data = await getAnalyticsDashboard(ctx, {
      range: url.searchParams.get("range"),
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      agent: url.searchParams.get("agent"),
    });

    if (data.locked) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PLAN_LIMIT",
            message: `Analytics range exceeds the ${data.plan} plan limit.`,
          },
        },
        { status: 402 },
      );
    }

    const csv = analyticsDashboardToCsv(data);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${slug}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, error: toApiError(error) }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }
}
