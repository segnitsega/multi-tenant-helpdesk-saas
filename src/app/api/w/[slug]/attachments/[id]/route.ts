import { NextResponse } from "next/server";
import { ForbiddenError, toApiError } from "@/lib/api-error";
import { getAttachmentDownloadUrl } from "@/server/services/attachment.service";
import { requireApiTenant } from "@/server/tenancy/api-context";
import { assertCan } from "@/server/tenancy/permissions";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await context.params;
    const ctx = await requireApiTenant(slug);
    assertCan(ctx, "ticket.view");

    const { url } = await getAttachmentDownloadUrl(ctx, id);
    return NextResponse.redirect(url);
  } catch (error) {
    const shape = toApiError(error);
    const status = error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ ok: false, error: shape }, { status });
  }
}
