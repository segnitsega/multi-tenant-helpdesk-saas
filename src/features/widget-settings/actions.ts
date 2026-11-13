"use server";

import { tenantAction } from "@/server/tenancy/action";
import { updateWidgetSettingsSchema } from "@/lib/validators/widget";
import { upsertWidgetSettings } from "@/server/services/widget.service";

export const updateWidgetSettingsAction = tenantAction(
  "settings.manage",
  updateWidgetSettingsSchema,
  async (ctx, input) => {
    const row = await upsertWidgetSettings(ctx, input);
    if (!row) throw new Error("Could not save widget settings");
    return {
      color: row.color,
      greeting: row.greeting,
      allowedOrigins: Array.isArray(row.allowedOrigins)
        ? (row.allowedOrigins as string[])
        : [],
      showPoweredBy: row.showPoweredBy,
    };
  },
);
