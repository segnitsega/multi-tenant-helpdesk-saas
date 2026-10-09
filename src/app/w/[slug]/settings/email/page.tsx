import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function EmailSettingsPage() {
  return (
    <SettingsLayout
      title="Email"
      description="Inbound address, forwarding setup, and delivery checks."
    >
      <EmptyState
        title="Coming soon"
        description="Email forwarding and inbound logging land in a later phase."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
