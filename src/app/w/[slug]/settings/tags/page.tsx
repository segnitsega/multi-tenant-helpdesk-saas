import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function TagsSettingsPage() {
  return (
    <SettingsLayout
      title="Tags"
      description="Organize tickets with tags and custom fields."
    >
      <EmptyState
        title="Coming soon"
        description="Tag and custom field management will live here."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
