import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { listAutomationRules } from "@/server/services/automation.service";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { AutomationsSettings } from "@/features/automations/components/automations-settings";
import { SettingsAccessDenied } from "@/components/settings-access-denied";
import type {
  AutomationAction,
  AutomationConditions,
} from "@/lib/automation-evaluator";

export default async function AutomationsSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "settings.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return <SettingsAccessDenied slug={slug} readonly={ctx.readonly} />;
    }
    throw error;
  }

  const rules = await listAutomationRules(ctx);

  return (
    <SettingsLayout
      title="Automations"
      description="Rules that trigger on ticket events."
    >
      <AutomationsSettings
        slug={slug}
        rules={rules.map((row) => ({
          id: row.id,
          name: row.name,
          trigger: row.trigger as "ticket.created" | "message.created",
          conditions: row.conditions as AutomationConditions,
          actions: row.actions as AutomationAction[],
          enabled: row.enabled,
          position: row.position,
        }))}
      />
    </SettingsLayout>
  );
}
