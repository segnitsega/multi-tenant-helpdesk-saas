import {
  ArchiveIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ClockIcon,
  PauseIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TICKET_STATUSES = [
  "OPEN",
  "PENDING",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

const STATUS_CONFIG: Record<
  TicketStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  OPEN: {
    label: "Open",
    icon: CircleDotIcon,
    className: "bg-info/10 text-info border-transparent",
  },
  PENDING: {
    label: "Pending",
    icon: ClockIcon,
    className: "bg-warning/10 text-warning border-transparent",
  },
  ON_HOLD: {
    label: "On hold",
    icon: PauseIcon,
    className:
      "border-transparent bg-[hsl(270_35%_45%/0.12)] text-[hsl(270_40%_40%)] dark:text-[hsl(270_45%_75%)]",
  },
  RESOLVED: {
    label: "Resolved",
    icon: CheckCircle2Icon,
    className: "bg-success/10 text-success border-transparent",
  },
  CLOSED: {
    label: "Closed",
    icon: ArchiveIcon,
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
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
