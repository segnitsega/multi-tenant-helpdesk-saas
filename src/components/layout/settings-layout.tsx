"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { settingsNav } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SettingsNav({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-full gap-1 overflow-x-auto lg:w-48 lg:shrink-0 lg:flex-col lg:overflow-visible">
      {settingsNav.map((item) => {
        const href = item.href(slug);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SettingsLayout({
  title,
  description,
  children,
  dirty = false,
  saving = false,
  onSave,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  dirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-3xl px-4 py-8 pb-24">
      <header className="mb-8">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </header>
      <div className="space-y-8">{children}</div>
      {dirty ? (
        <div className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky bottom-0 z-10 -mx-4 mt-10 border-t px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-end gap-2">
            <p className="text-muted-foreground mr-auto text-sm">
              You have unsaved changes
            </p>
            <Button
              type="button"
              disabled={saving || !onSave}
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
