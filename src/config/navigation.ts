import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Inbox,
  Settings,
  Users,
  Building2,
  Mail,
  Timer,
  MessageSquareText,
  Tags,
  Workflow,
  Code2,
  CreditCard,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: (slug: string) => string;
  icon: LucideIcon;
  shortcut?: string;
};

export const primaryNav: NavItem[] = [
  {
    id: "inbox",
    label: "Inbox",
    href: (slug) => `/w/${slug}/inbox`,
    icon: Inbox,
    shortcut: "g i",
  },
  {
    id: "customers",
    label: "Customers",
    href: (slug) => `/w/${slug}/customers`,
    icon: Users,
    shortcut: "g c",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: (slug) => `/w/${slug}/analytics`,
    icon: BarChart3,
    shortcut: "g a",
  },
  {
    id: "settings",
    label: "Settings",
    href: (slug) => `/w/${slug}/settings/general`,
    icon: Settings,
    shortcut: "g s",
  },
];

export type SettingsNavItem = {
  id: string;
  label: string;
  href: (slug: string) => string;
  icon: LucideIcon;
};

export const settingsNav: SettingsNavItem[] = [
  {
    id: "general",
    label: "General",
    href: (slug) => `/w/${slug}/settings/general`,
    icon: Building2,
  },
  {
    id: "team",
    label: "Team",
    href: (slug) => `/w/${slug}/settings/team`,
    icon: Users,
  },
  {
    id: "email",
    label: "Email",
    href: (slug) => `/w/${slug}/settings/email`,
    icon: Mail,
  },
  {
    id: "sla",
    label: "SLA",
    href: (slug) => `/w/${slug}/settings/sla`,
    icon: Timer,
  },
  {
    id: "canned-replies",
    label: "Canned replies",
    href: (slug) => `/w/${slug}/settings/canned-replies`,
    icon: MessageSquareText,
  },
  {
    id: "tags",
    label: "Tags",
    href: (slug) => `/w/${slug}/settings/tags`,
    icon: Tags,
  },
  {
    id: "automations",
    label: "Automations",
    href: (slug) => `/w/${slug}/settings/automations`,
    icon: Workflow,
  },
  {
    id: "widget",
    label: "Widget",
    href: (slug) => `/w/${slug}/settings/widget`,
    icon: Code2,
  },
  {
    id: "billing",
    label: "Billing",
    href: (slug) => `/w/${slug}/settings/billing`,
    icon: CreditCard,
  },
];

export function matchPrimaryNav(pathname: string, slug: string): string | null {
  if (pathname.startsWith(`/w/${slug}/settings`)) return "settings";
  if (pathname.startsWith(`/w/${slug}/inbox`)) return "inbox";
  if (pathname.startsWith(`/w/${slug}/customers`)) return "customers";
  if (pathname.startsWith(`/w/${slug}/analytics`)) return "analytics";
  return null;
}
