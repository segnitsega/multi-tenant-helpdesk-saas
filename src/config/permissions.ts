export const PERMISSIONS = {
  "ticket.view": ["OWNER", "ADMIN", "AGENT"],
  "ticket.reply": ["OWNER", "ADMIN", "AGENT"],
  "ticket.update": ["OWNER", "ADMIN", "AGENT"],
  "ticket.delete": ["OWNER", "ADMIN"],
  "canned.manage": ["OWNER", "ADMIN"],
  "settings.manage": ["OWNER", "ADMIN"],
  "member.invite": ["OWNER", "ADMIN"],
  "member.manage": ["OWNER", "ADMIN"],
  "billing.manage": ["OWNER"],
  "workspace.delete": ["OWNER"],
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type Role = (typeof PERMISSIONS)[Permission][number];
