import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { systemDb } from "@/server/db/system";
import { getWidgetSettings } from "@/server/services/widget.service";
import { effectivePlan } from "@/lib/effective-plan";
import { planLimits } from "@/config/plans";
import { WidgetSettingsForm } from "@/features/widget-settings/components/widget-settings-form";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { SettingsAccessDenied } from "@/components/settings-access-denied";
import { env } from "@/server/env";

export default async function WidgetSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "settings.manage");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return <SettingsAccessDenied slug={slug} readonly={ctx.readonly} />;
    }
    throw e;
  }

  const workspace = await systemDb.orm.public.Workspace.where({
    id: ctx.workspaceId,
  }).first();
  if (!workspace) notFound();

  const settings = await getWidgetSettings(ctx.workspaceId);
  const widgetEnabled = planLimits(effectivePlan(workspace)).widget;

  return (
    <SettingsLayout
      title="Widget"
      description="Embed snippet, appearance, and allowed origins."
    >
      <WidgetSettingsForm
        slug={slug}
        widgetKey={workspace.widgetKey}
        appUrl={env.APP_URL}
        widgetEnabled={widgetEnabled}
        initial={{
          color: settings.color,
          greeting: settings.greeting,
          allowedOrigins: settings.allowedOrigins,
          showPoweredBy: settings.showPoweredBy,
        }}
      />
    </SettingsLayout>
  );
}
