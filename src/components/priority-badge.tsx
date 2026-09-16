import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpIcon,
  MinusIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TICKET_PRIORITIES = ["URGENT", "HIGH", "NORMAL", "LOW"] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

const PRIORITY_CONFIG: Record<
  TicketPriority,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  URGENT: {
    label: "Urgent",
    icon: ChevronsUpIcon,
    className: "bg-destructive/10 text-destructive border-transparent",
  },
  HIGH: {
    label: "High",
    icon: ChevronUpIcon,
    className: "bg-warning/10 text-warning border-transparent",
  },
  NORMAL: {
    label: "Normal",
    icon: MinusIcon,
    className: "bg-muted text-muted-foreground border-transparent",
  },
  LOW: {
    label: "Low",
    icon: ChevronDownIcon,
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
      data-icon="inline-start"
    >
      <Icon aria-hidden />
      {config.label}
    </Badge>
  );
}
