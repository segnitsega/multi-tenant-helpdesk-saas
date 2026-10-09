import { Users } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CustomersPage() {
  return (
    <PlaceholderPage
      icon={<Users />}
      title="Customers"
      description="Customer list and profiles will show up here once ticket services are wired."
    />
  );
}
