export type ShortcutScope =
  | "global"
  | "inbox"
  | "ticket"
  | "composer";

export type ShortcutDefinition = {
  id: string;
  keys: string;
  label: string;
  scope: ShortcutScope;
};

export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "palette",
    keys: "⌘/Ctrl+K",
    label: "Open command palette",
    scope: "global",
  },
  {
    id: "cheat-sheet",
    keys: "?",
    label: "Show keyboard shortcuts",
    scope: "global",
  },
  { id: "go-inbox", keys: "g i", label: "Go to inbox", scope: "global" },
  {
    id: "go-customers",
    keys: "g c",
    label: "Go to customers",
    scope: "global",
  },
  {
    id: "go-analytics",
    keys: "g a",
    label: "Go to analytics",
    scope: "global",
  },
  {
    id: "go-settings",
    keys: "g s",
    label: "Go to settings",
    scope: "global",
  },
  { id: "next-ticket", keys: "j", label: "Next ticket", scope: "inbox" },
  {
    id: "prev-ticket",
    keys: "k",
    label: "Previous ticket",
    scope: "inbox",
  },
  {
    id: "open-ticket",
    keys: "Enter",
    label: "Open selected ticket",
    scope: "inbox",
  },
  { id: "select-row", keys: "x", label: "Select row", scope: "inbox" },
  { id: "focus-search", keys: "/", label: "Focus search", scope: "inbox" },
  { id: "assign-me", keys: "a", label: "Assign to me", scope: "ticket" },
  { id: "resolve", keys: "e", label: "Resolve ticket", scope: "ticket" },
  { id: "pending", keys: "p", label: "Set pending", scope: "ticket" },
  {
    id: "focus-reply",
    keys: "r",
    label: "Focus reply composer",
    scope: "ticket",
  },
  {
    id: "focus-note",
    keys: "n",
    label: "Focus internal note",
    scope: "ticket",
  },
  {
    id: "send",
    keys: "⌘/Ctrl+Enter",
    label: "Send message",
    scope: "composer",
  },
  {
    id: "escape",
    keys: "Esc",
    label: "Close dialog / deselect",
    scope: "global",
  },
];

export const SHORTCUT_SCOPES: ShortcutScope[] = [
  "global",
  "inbox",
  "ticket",
  "composer",
];

export function shortcutsByScope(scope: ShortcutScope) {
  return SHORTCUTS.filter((row) => row.scope === scope);
}
