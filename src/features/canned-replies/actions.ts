"use server";

import { tenantAction } from "@/server/tenancy/action";
import {
  createCannedReply,
  deleteCannedReply,
  updateCannedReply,
} from "@/server/services/canned-reply.service";
import {
  cannedReplyIdSchema,
  cannedReplyInputSchema,
  updateCannedReplySchema,
} from "@/lib/validators/canned-reply";
import { sanitizeRichHtml } from "@/lib/sanitize";

export const createCannedReplyAction = tenantAction(
  "canned.manage",
  cannedReplyInputSchema,
  async (ctx, input) => {
    const row = await createCannedReply(ctx, {
      ...input,
      bodyHtml: sanitizeRichHtml(input.bodyHtml),
    });
    return { id: row.id };
  },
);

export const updateCannedReplyAction = tenantAction(
  "canned.manage",
  updateCannedReplySchema,
  async (ctx, input) => {
    const { id, ...patch } = input;
    const row = await updateCannedReply(ctx, id, {
      ...patch,
      bodyHtml:
        patch.bodyHtml === undefined
          ? undefined
          : sanitizeRichHtml(patch.bodyHtml),
    });
    if (!row) throw new Error("Canned reply not found");
    return { id: row.id };
  },
);

export const deleteCannedReplyAction = tenantAction(
  "canned.manage",
  cannedReplyIdSchema,
  async (ctx, input) => {
    await deleteCannedReply(ctx, input.id);
    return { deleted: true as const };
  },
);
