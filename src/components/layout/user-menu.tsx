"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

export function UserMenu({
  user,
  collapsed,
}: {
  user: { name: string | null; email: string | null };
  collapsed?: boolean;
}) {
  const initials = (user.name ?? user.email ?? "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
      {!collapsed ? <ThemeToggle /> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className={cn(
                "h-9 gap-2 px-1.5",
                collapsed ? "size-9 justify-center px-0" : "w-full justify-start",
              )}
              aria-label="User menu"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          {!collapsed ? (
            <span className="min-w-0 flex-1 truncate text-left text-sm">
              {user.name ?? user.email ?? "Account"}
            </span>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground text-sm font-medium">
                {user.name ?? "Account"}
              </span>
              {user.email ? (
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              ) : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserRound className="size-4" />
            Profile
          </DropdownMenuItem>
          {collapsed ? (
            <div className="px-1.5 py-1">
              <ThemeToggle />
            </div>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void logout();
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
