import { EmptyState } from "@/components/empty-state";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<Inbox />}
        title="Select a ticket"
        description="Choose a conversation from the list to read and reply."
      />
    </div>
  );
}
