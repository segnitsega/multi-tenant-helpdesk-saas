import { NextResponse } from "next/server";
import { z } from "zod";
import { ForbiddenError, toApiError } from "@/lib/api-error";
import { requireApiTenant } from "@/server/tenancy/api-context";
import { assertCan } from "@/server/tenancy/permissions";
import {
  heartbeatPresence,
  publishTyping,
} from "@/server/realtime/presence";
import { listMembers } from "@/server/services/membership.service";

const bodySchema = z.object({
  drafting: z.boolean().optional(),
  typing: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id: ticketId } = await context.params;
    const ctx = await requireApiTenant(slug);
    assertCan(ctx, "ticket.view");

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: toApiError(parsed.error) },
        { status: 400 },
      );
    }

    const members = await listMembers(ctx.workspaceId);
    const me = members.find((member) => member.id === ctx.membershipId);
    const name = me?.name?.trim() || me?.email || "Agent";

    const viewers = await heartbeatPresence({
      workspaceId: ctx.workspaceId,
      ticketId,
      membershipId: ctx.membershipId,
      name,
      drafting: parsed.data.drafting,
    });

    if (typeof parsed.data.typing === "boolean") {
      await publishTyping({
        workspaceId: ctx.workspaceId,
        ticketId,
        membershipId: ctx.membershipId,
        name,
        isTyping: parsed.data.typing,
      });
    }

    return NextResponse.json({ ok: true, data: { viewers } });
  } catch (error) {
    const shape = toApiError(error);
    const status = error instanceof ForbiddenError ? 403 : 400;
    return NextResponse.json({ ok: false, error: shape }, { status });
  }
}
