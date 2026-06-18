"use server";

import { z } from "zod";
import { tenantAction } from "@/server/tenancy/action";
import { replayInboundEmail } from "@/server/services/inbound-email.service";

export const replayInboundEmailAction = tenantAction(
  "settings.manage",
  z.object({ id: z.string().uuid() }),
  async (ctx, input) => {
    return replayInboundEmail(ctx, input.id);
  },
);
