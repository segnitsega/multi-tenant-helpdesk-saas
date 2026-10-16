import { NextResponse } from "next/server";
import { ForbiddenError, toApiError } from "@/lib/api-error";
import { presignUploadSchema } from "@/lib/validators/upload";
import { createPendingAttachment } from "@/server/services/attachment.service";
import { requireApiTenant } from "@/server/tenancy/api-context";
import { assertCan } from "@/server/tenancy/permissions";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const ctx = await requireApiTenant(slug);
    assertCan(ctx, "ticket.reply");

    const body = await request.json();
    const parsed = presignUploadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: toApiError(parsed.error) },
        { status: 400 },
      );
    }

    const { attachment, uploadUrl } = await createPendingAttachment(
      ctx,
      parsed.data,
    );

    return NextResponse.json({
      ok: true,
      data: {
        attachmentId: attachment.id,
        uploadUrl,
        storageKey: attachment.storageKey,
      },
    });
  } catch (error) {
    const shape = toApiError(error);
    const status = error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ ok: false, error: shape }, { status });
  }
}
