"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Rail } from "@/components/layout/rail";
import { TopBar } from "@/components/layout/top-bar";
import { CommandPaletteLazy } from "@/components/layout/command-palette-lazy";
import { ShortcutSheet } from "@/components/layout/shortcut-sheet";
import { ReadonlyBanner } from "@/components/readonly-banner";
import type { WorkspaceOption } from "@/components/layout/workspace-switcher";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useMediaQuery } from "@/hooks/use-media-query";
import { matchPrimaryNav, primaryNav } from "@/config/navigation";

export function AppShell({
  slug,
  workspaces,
  user,
  membershipId,
  readonly = false,
  children,
}: {
  slug: string;
  workspaces: WorkspaceOption[];
  user: { name: string | null; email: string | null };
  membershipId: string;
  readonly?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const collapsed = !isDesktop;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const title = useMemo(() => {
    const activeId = matchPrimaryNav(pathname, slug);
    if (pathname.includes("/settings/")) {
      const segment = pathname.split("/settings/")[1]?.split("/")[0];
      if (segment) {
        return segment
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
      }
      return "Settings";
    }
    return primaryNav.find((item) => item.id === activeId)?.label ?? "Relay";
  }, [pathname, slug]);

  useHotkeys(["meta+k", "ctrl+k"], () => {
    setPaletteOpen((open) => !open);
  });

  useHotkeys("?", () => {
    setShortcutsOpen((open) => !open);
  });

  useHotkeys("g i", () => {
    router.push(`/w/${slug}/inbox`);
  });

  useHotkeys("g c", () => {
    router.push(`/w/${slug}/customers`);
  });

  useHotkeys("g a", () => {
    router.push(`/w/${slug}/analytics`);
  });

  useHotkeys("g s", () => {
    router.push(`/w/${slug}/settings/general`);
  });

  return (
    <div className="bg-background flex h-dvh min-h-0 w-full overflow-hidden">
      <Rail
        slug={slug}
        workspaces={workspaces}
        user={user}
        collapsed={collapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {readonly ? <ReadonlyBanner /> : null}
        <TopBar title={title} onOpenCommandPalette={() => setPaletteOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPaletteLazy
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        slug={slug}
        membershipId={membershipId}
      />
      <ShortcutSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
