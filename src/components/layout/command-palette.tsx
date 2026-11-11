"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
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
import { searchTicketsAction } from "@/features/tickets/actions-search";
import { updateTicketAction } from "@/features/tickets/actions";
import { useDebounce } from "@/hooks/use-debounce";

export function CommandPalette({
  open,
  onOpenChange,
  slug,
  membershipId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  membershipId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 200);
  const [tickets, setTickets] = useState<
    Array<{ number: number; subject: string; status: string }>
  >([]);
  const [pending, startTransition] = useTransition();

  const activeTicket = pathname.match(/\/inbox\/(\d+)/)?.[1]
    ? Number(pathname.match(/\/inbox\/(\d+)/)?.[1])
    : undefined;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTickets([]);
      return;
    }
    if (!debounced.trim()) {
      setTickets([]);
      return;
    }
    startTransition(async () => {
      const rows = await searchTicketsAction(slug, debounced);
      setTickets(rows);
    });
  }, [debounced, open, slug]);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function runTheme(theme: string) {
    onOpenChange(false);
    setTheme(theme);
  }

  async function patchTicket(patch: {
    assigneeMembershipId?: string | null;
    status?: "PENDING" | "RESOLVED";
  }) {
    if (!activeTicket) return;
    onOpenChange(false);
    const result = await updateTicketAction(slug, {
      number: activeTicket,
      ...patch,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Ticket updated");
    router.refresh();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search tickets, jump around, or run actions"
    >
      <Command shouldFilter={tickets.length === 0}>
        <CommandInput
          placeholder="Search tickets or jump to…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {pending ? "Searching…" : "No results found."}
          </CommandEmpty>

          {activeTicket ? (
            <CommandGroup heading="Ticket actions">
              <CommandItem
                value="Assign to me"
                onSelect={() => {
                  void patchTicket({ assigneeMembershipId: membershipId });
                }}
              >
                Assign to me
                <CommandShortcut>A</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Set pending"
                onSelect={() => {
                  void patchTicket({ status: "PENDING" });
                }}
              >
                Set pending
                <CommandShortcut>P</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Resolve ticket"
                onSelect={() => {
                  void patchTicket({ status: "RESOLVED" });
                }}
              >
                Resolve ticket
                <CommandShortcut>E</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="Copy ticket link"
                onSelect={() => {
                  const url = `${window.location.origin}/w/${slug}/inbox/${activeTicket}`;
                  void navigator.clipboard.writeText(url);
                  onOpenChange(false);
                  toast.success("Link copied");
                }}
              >
                Copy ticket link
              </CommandItem>
            </CommandGroup>
          ) : null}

          {tickets.length > 0 ? (
            <CommandGroup heading="Tickets">
              {tickets.map((ticket) => (
                <CommandItem
                  key={ticket.number}
                  value={`#${ticket.number} ${ticket.subject}`}
                  onSelect={() => go(`/w/${slug}/inbox/${ticket.number}`)}
                >
                  #{ticket.number} {ticket.subject}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

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

          <CommandGroup heading="Actions">
            <CommandItem
              value="New canned reply"
              onSelect={() => go(`/w/${slug}/settings/canned-replies`)}
            >
              New canned reply
            </CommandItem>
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

          <CommandGroup heading="Theme">
            <CommandItem value="Theme light" onSelect={() => runTheme("light")}>
              Light theme
            </CommandItem>
            <CommandItem value="Theme dark" onSelect={() => runTheme("dark")}>
              Dark theme
            </CommandItem>
            <CommandItem
              value="Theme system"
              onSelect={() => runTheme("system")}
            >
              System theme
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
