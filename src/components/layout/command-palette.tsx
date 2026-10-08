"use client";

import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { primaryNav, settingsNav } from "@/config/navigation";

export function CommandPalette({
  open,
  onOpenChange,
  slug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
}) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a page in this workspace"
    >
      <Command>
        <CommandInput placeholder="Go to…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => go(item.href(slug))}
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.shortcut ? (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Settings">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`Settings ${item.label}`}
                  onSelect={() => go(item.href(slug))}
                >
                  <Icon className="size-4" />
                  {item.label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
