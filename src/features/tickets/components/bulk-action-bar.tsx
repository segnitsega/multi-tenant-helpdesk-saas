"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BulkActionBar({
  count,
  onStatus,
  onClose,
  onMerge,
  onClear,
}: {
  count: number;
  onStatus: (status: string) => void;
  onClose: () => void;
  onMerge: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="border-border bg-background flex items-center gap-2 border-b px-3 py-2">
      <p className="text-muted-foreground text-sm">
        {count} selected
      </p>
      <Select
        onValueChange={(value) => {
          if (typeof value === "string" && value) onStatus(value);
        }}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder="Set status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPEN">Open</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="ON_HOLD">On hold</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={onClose}>
        Close
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={count !== 2}
        onClick={onMerge}
      >
        Merge
      </Button>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
}
