"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { InboxIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PriorityBadge, TICKET_PRIORITIES } from "@/components/priority-badge";
import { SlaBadge } from "@/components/sla-badge";
import { StatusBadge, TICKET_STATUSES } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function createSlaExamples() {
  const now = Date.now();
  return {
    ok: {
      startsAt: new Date(now - 60 * 60 * 1000),
      dueAt: new Date(now + 3 * 60 * 60 * 1000),
    },
    warn: {
      startsAt: new Date(now - 50 * 60 * 1000),
      dueAt: new Date(now + 10 * 60 * 1000),
    },
    breached: {
      startsAt: new Date(now - 2 * 60 * 60 * 1000),
      dueAt: new Date(now - 12 * 60 * 1000),
    },
  };
}

export default function DevComponentsPage() {
  const { theme, setTheme } = useTheme();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorKey, setErrorKey] = useState(0);
  // Lazy state init is allowed to be impure; Date.now in render/useMemo is not.
  const [slaExamples] = useState(createSlaExamples);

  return (
    <div className="bg-background text-foreground min-h-full">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
              Dev only
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Component showcase
            </h1>
            <p className="text-muted-foreground max-w-xl text-sm">
              Visual check for design tokens and shared components. Toggle theme
              to verify light and dark.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={theme === value ? "default" : "outline"}
                onClick={() => setTheme(value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </header>

        <Separator />

        <Section
          title="Status badges"
          description="DESIGN.md §2.2 ticket status"
        >
          <div className="flex flex-wrap gap-2">
            {TICKET_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Section>

        <Section
          title="Priority badges"
          description="Urgent / High / Normal / Low"
        >
          <div className="flex flex-wrap gap-2">
            {TICKET_PRIORITIES.map((priority) => (
              <PriorityBadge key={priority} priority={priority} />
            ))}
          </div>
        </Section>

        <Section
          title="SLA badges"
          description="Green when over 50% left, amber under 50%, red when breached"
        >
          <div className="flex flex-wrap gap-2">
            <SlaBadge
              startsAt={slaExamples.ok.startsAt}
              dueAt={slaExamples.ok.dueAt}
            />
            <SlaBadge
              startsAt={slaExamples.warn.startsAt}
              dueAt={slaExamples.warn.dueAt}
            />
            <SlaBadge
              startsAt={slaExamples.breached.startsAt}
              dueAt={slaExamples.breached.dueAt}
            />
          </div>
        </Section>

        <Section title="Empty & error states">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-border rounded-lg border">
              <EmptyState
                icon={<InboxIcon />}
                title="No tickets yet"
                description="When customers email or use the widget, tickets will show up here."
                action={
                  <Button type="button" size="sm" variant="outline">
                    Send a test email
                  </Button>
                }
              />
            </div>
            <div className="border-border rounded-lg border">
              <ErrorState
                key={errorKey}
                title="Couldn't load tickets"
                description="Check your connection and try again."
                onRetry={() => {
                  setErrorKey((k) => k + 1);
                  toast.success("Retry clicked");
                }}
              />
            </div>
          </div>
        </Section>

        <Section title="Confirm dialog">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Delete ticket…
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Delete this ticket?"
            description="This cannot be undone. Messages and attachments will be removed."
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success("Confirmed (demo only)");
            }}
          />
        </Section>

        <Section
          title="shadcn primitives"
          description="Sanity check for tokens"
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button">Primary</Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
              <Button type="button" variant="outline">
                Outline
              </Button>
              <Button type="button" variant="ghost">
                Ghost
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.message("Toast from Sonner")}
              >
                Show toast
              </Button>
            </div>
            <div className="flex max-w-sm flex-col gap-2">
              <Input placeholder="Search tickets…" />
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
