export type TicketListItem = {
  id: string;
  number: number;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  assigneeMembershipId: string | null;
  customerId: string;
  customerName: string | null;
  customerEmail: string;
  preview: string;
  tags: { id: string; name: string; color: string }[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
  slaFirstResponseDueAt: string | null;
  slaResolutionDueAt: string | null;
  lastMessageAt: string;
  createdAt: string;
};

export type TicketAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type TicketMessage = {
  id: string;
  authorType: string;
  authorMembershipId: string | null;
  authorCustomerId: string | null;
  kind: string;
  bodyHtml: string;
  bodyText: string;
  deliveryStatus: string | null;
  createdAt: string;
  attachments: TicketAttachment[];
};

export type CannedReplySummary = {
  id: string;
  title: string;
  shortcut: string | null;
  bodyHtml: string;
};

export type TicketDetail = {
  ticket: TicketListItem & {
    closedAt: string | null;
    mergedIntoTicketId: string | null;
  };
  customer: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
  messages: TicketMessage[];
  members: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  }[];
  recentTickets: { number: number; subject: string; status: string }[];
  cannedReplies: CannedReplySummary[];
  agentName: string | null;
};

export type InboxViewId =
  | "open"
  | "mine"
  | "unassigned"
  | "pending"
  | "resolved"
  | "closed";

export type ViewCounts = Record<InboxViewId, number>;
