import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function GeneralSettingsPage() {
  return (
    <SettingsLayout
      title="General"
      description="Workspace name, slug, timezone, and branding."
    >
      <EmptyState
        title="Coming soon"
        description="General workspace settings will be editable here."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
