"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type WorkspaceOption = {
  workspaceId: string;
  name: string;
  slug: string;
  role: string;
};

export function WorkspaceSwitcher({
  currentSlug,
  workspaces,
  collapsed,
}: {
  currentSlug: string;
  workspaces: WorkspaceOption[];
  collapsed?: boolean;
}) {
  const current =
    workspaces.find((workspace) => workspace.slug === currentSlug) ??
    workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              "text-foreground h-9 w-full justify-between gap-2 px-2 font-medium",
              collapsed && "size-9 justify-center px-0",
            )}
            aria-label="Switch workspace"
          />
        }
      >
        <span
          className={cn(
            "bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
          )}
        >
          {(current?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {current?.name ?? "Workspace"}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="w-56"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.workspaceId}
              render={<Link href={`/w/${workspace.slug}/inbox`} />}
              className="gap-2"
            >
              <span className="bg-muted flex size-5 items-center justify-center rounded text-[10px] font-semibold">
                {workspace.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              {workspace.slug === currentSlug ? (
                <Check className="size-3.5" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/onboarding?new=1" />}>
            <Plus className="size-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
