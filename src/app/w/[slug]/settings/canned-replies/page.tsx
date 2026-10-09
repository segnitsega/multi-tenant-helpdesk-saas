import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function CannedRepliesSettingsPage() {
  return (
    <SettingsLayout
      title="Canned replies"
      description="Reusable replies with shortcuts and variables."
    >
      <EmptyState
        title="Coming soon"
        description="Create and manage canned replies from this page."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
