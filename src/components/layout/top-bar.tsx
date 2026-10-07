"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({
  title,
  onOpenCommandPalette,
}: {
  title: string;
  onOpenCommandPalette: () => void;
}) {
  return (
    <header className="border-border bg-background sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b px-4">
      <h1 className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
        {title}
      </h1>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onOpenCommandPalette}
        className="text-muted-foreground hidden max-w-56 flex-1 justify-start gap-2 sm:inline-flex"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search…</span>
        <kbd className="bg-muted text-muted-foreground ml-auto rounded px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground sm:hidden"
        onClick={onOpenCommandPalette}
        aria-label="Open command palette"
      >
        <Search className="size-4" />
      </Button>
    </header>
  );
}
