import { getTenantContext } from "@/server/tenancy/context";
import { can } from "@/server/tenancy/permissions";
import { getBillingSnapshot } from "@/server/services/billing.service";
import { BillingSettings } from "@/features/billing/components/billing-settings";
import { SettingsLayout } from "@/components/layout/settings-layout";

export default async function BillingSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  const snapshot = await getBillingSnapshot(ctx.workspaceId);

  return (
    <SettingsLayout
      title="Billing"
      description="Plan, usage, and billing portal access."
    >
      <BillingSettings
        slug={slug}
        canManage={can(ctx.role, "billing.manage", ctx.readonly)}
        plan={snapshot.plan}
        subscriptionStatus={snapshot.subscriptionStatus}
        pastDue={snapshot.pastDue}
        limits={snapshot.limits}
        usage={snapshot.usage}
        hasStripeCustomer={Boolean(snapshot.stripeCustomerId)}
      />
    </SettingsLayout>
  );
}
