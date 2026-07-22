import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { assertCan } from "@/server/tenancy/permissions";
import { ForbiddenError } from "@/lib/api-error";
import { listSlaPolicies } from "@/server/services/sla.service";
import { SettingsLayout } from "@/components/layout/settings-layout";
import { SlaSettings } from "@/features/sla/components/sla-settings";

export default async function SlaSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  try {
    assertCan(ctx, "settings.manage");
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const policies = await listSlaPolicies(ctx);

  return (
    <SettingsLayout
      title="SLA"
      description="First-response and resolution targets by priority."
    >
      <SlaSettings
        slug={slug}
        policies={policies.map((row) => ({
          id: row.id,
          priority: row.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
          firstResponseMinutes: row.firstResponseMinutes,
          resolutionMinutes: row.resolutionMinutes,
          enabled: row.enabled,
        }))}
      />
    </SettingsLayout>
  );
}
