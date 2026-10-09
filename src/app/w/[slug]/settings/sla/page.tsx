import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function SlaSettingsPage() {
  return (
    <SettingsLayout
      title="SLA"
      description="First-response and resolution targets by priority."
    >
      <EmptyState
        title="Coming soon"
        description="SLA policy editing will appear here."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
