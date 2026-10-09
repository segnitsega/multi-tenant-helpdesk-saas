import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function BillingSettingsPage() {
  return (
    <SettingsLayout
      title="Billing"
      description="Plan, usage, and billing portal access."
    >
      <EmptyState
        title="Coming soon"
        description="Billing and plan management land in a later phase."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
