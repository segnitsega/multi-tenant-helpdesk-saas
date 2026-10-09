import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AnalyticsPage() {
  return (
    <PlaceholderPage
      icon={<BarChart3 />}
      title="Analytics"
      description="Workspace metrics and charts will land here after the reporting phase."
    />
  );
}
