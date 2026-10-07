"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { matchPrimaryNav, primaryNav } from "@/config/navigation";
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/layout/workspace-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function Rail({
  slug,
  workspaces,
  user,
  collapsed,
}: {
  slug: string;
  workspaces: WorkspaceOption[];
  user: { name: string | null; email: string | null };
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const activeId = matchPrimaryNav(pathname, slug);

  return (
    <TooltipProvider delay={200}>
      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={cn(
          "border-border bg-background flex h-full shrink-0 flex-col border-r transition-[width] duration-200 ease-out",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div className={cn("px-2 pt-3", collapsed && "px-1.5")}>
          <Link
            href={`/w/${slug}/inbox`}
            className={cn(
              "text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold tracking-tight",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="bg-foreground text-background flex size-6 items-center justify-center rounded-md text-[11px] font-bold">
              R
            </span>
            {!collapsed ? <span>Relay</span> : null}
          </Link>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-2">
          {primaryNav.map((item) => {
            const href = item.href(slug);
            const active = activeId === item.id;
            const Icon = item.icon;
            const link = (
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );

            if (!collapsed) return <div key={item.id}>{link}</div>;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger render={<div className="w-full" />}>
                  {link}
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                  {item.shortcut ? (
                    <span className="text-muted-foreground ml-2 text-[10px] tracking-wide uppercase">
                      {item.shortcut}
                    </span>
                  ) : null}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div
          className={cn(
            "border-border mt-auto space-y-1 border-t p-2",
            collapsed && "px-1.5",
          )}
        >
          <WorkspaceSwitcher
            currentSlug={slug}
            workspaces={workspaces}
            collapsed={collapsed}
          />
          <UserMenu user={user} collapsed={collapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}
