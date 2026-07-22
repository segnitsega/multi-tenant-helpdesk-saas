"use server";

import { tenantAction } from "@/server/tenancy/action";
import { upsertSlaPolicy } from "@/server/services/sla.service";
import { updateSlaPolicySchema } from "@/lib/validators/sla";

export const upsertSlaPolicyAction = tenantAction(
  "settings.manage",
  updateSlaPolicySchema,
  async (ctx, input) => {
    const row = await upsertSlaPolicy(ctx, input);
    if (!row) throw new Error("Could not save SLA policy");
    return {
      id: row.id,
      priority: row.priority,
      enabled: row.enabled,
    };
  },
);
