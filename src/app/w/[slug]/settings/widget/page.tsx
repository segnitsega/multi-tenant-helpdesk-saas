import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function WidgetSettingsPage() {
  return (
    <SettingsLayout
      title="Widget"
      description="Embed snippet, appearance, and allowed origins."
    >
      <EmptyState
        title="Coming soon"
        description="Widget configuration will be available here."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
