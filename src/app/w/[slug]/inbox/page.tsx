import { Inbox } from "lucide-react";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function InboxPage() {
  return (
    <PlaceholderPage
      icon={<Inbox />}
      title="Inbox"
      description="Ticket list and detail arrive in a later phase. Use the rail or ⌘K to move around."
    />
  );
}
