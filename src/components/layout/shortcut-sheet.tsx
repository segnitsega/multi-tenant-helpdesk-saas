"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SHORTCUT_SCOPES,
  SHORTCUTS,
  type ShortcutScope,
} from "@/config/shortcuts";

const SCOPE_LABEL: Record<ShortcutScope, string> = {
  global: "Global",
  inbox: "Inbox",
  ticket: "Ticket",
  composer: "Composer",
};

export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {SHORTCUT_SCOPES.map((scope) => {
            const rows = SHORTCUTS.filter((item) => item.scope === scope);
            if (rows.length === 0) return null;
            return (
              <section key={scope} className="space-y-2">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {SCOPE_LABEL[scope]}
                </h3>
                <ul className="space-y-1.5">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span>{row.label}</span>
                      <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                        {row.keys}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
