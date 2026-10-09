import { SettingsLayout } from "@/components/layout/settings-layout";
import { EmptyState } from "@/components/empty-state";

export default function AutomationsSettingsPage() {
  return (
    <SettingsLayout
      title="Automations"
      description="Rules that trigger on ticket events."
    >
      <EmptyState
        title="Coming soon"
        description="Automation builder arrives with the automations phase."
        className="border-border rounded-lg border border-dashed py-16"
      />
    </SettingsLayout>
  );
}
