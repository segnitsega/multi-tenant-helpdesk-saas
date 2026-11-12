import { notFound } from "next/navigation";
import {
  getWidgetSettings,
  getWorkspaceByWidgetKey,
} from "@/server/services/widget.service";
import { WidgetApp } from "@/features/widget/components/widget-app";
import { effectivePlan } from "@/lib/effective-plan";
import { planLimits } from "@/config/plans";

export default async function WidgetPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  let workspace;
  try {
    workspace = await getWorkspaceByWidgetKey(key);
  } catch {
    notFound();
  }

  const limits = planLimits(effectivePlan(workspace));
  if (!limits.widget) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-sm text-slate-600">
        This workspace has not enabled the chat widget.
      </div>
    );
  }

  const settings = await getWidgetSettings(workspace.id);

  return (
    <WidgetApp
      widgetKey={key}
      workspaceName={workspace.name}
      color={settings.color}
      greeting={settings.greeting}
      showPoweredBy={settings.showPoweredBy}
    />
  );
}
