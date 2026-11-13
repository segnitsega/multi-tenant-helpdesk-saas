"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { updateWidgetSettingsAction } from "@/features/widget-settings/actions";

export function WidgetSettingsForm({
  slug,
  widgetKey,
  appUrl,
  initial,
  widgetEnabled,
}: {
  slug: string;
  widgetKey: string;
  appUrl: string;
  initial: {
    color: string;
    greeting: string;
    allowedOrigins: string[];
    showPoweredBy: boolean;
  };
  widgetEnabled: boolean;
}) {
  const router = useRouter();
  const [color, setColor] = useState(initial.color);
  const [greeting, setGreeting] = useState(initial.greeting);
  const [originsText, setOriginsText] = useState(
    initial.allowedOrigins.join("\n"),
  );
  const [showPoweredBy, setShowPoweredBy] = useState(initial.showPoweredBy);
  const [planLimit, setPlanLimit] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const snippet = `<script src="${appUrl}/widget.js" data-key="${widgetKey}" async></script>`;

  if (!widgetEnabled) {
    return (
      <UpgradePrompt
        slug={slug}
        title="Widget requires Pro"
        description="Upgrade to enable the embeddable chat widget for your site."
      />
    );
  }

  return (
    <div className="space-y-8">
      {planLimit ? <UpgradePrompt slug={slug} description={planLimit} /> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <label className="block space-y-1 text-sm">
          <span>Accent color</span>
          <Input value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Greeting</span>
          <Input
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Show “Powered by Relay”</span>
          <Switch
            checked={showPoweredBy}
            onCheckedChange={setShowPoweredBy}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Allowed origins</h2>
        <p className="text-muted-foreground text-sm">
          One origin per line. Use * to allow any origin in development.
        </p>
        <Textarea
          rows={4}
          value={originsText}
          onChange={(e) => setOriginsText(e.target.value)}
          placeholder={"https://example.com\nhttps://app.example.com"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Embed snippet</h2>
        <pre className="bg-muted overflow-x-auto rounded-lg p-3 text-xs">
          {snippet}
        </pre>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(snippet);
            toast.success("Snippet copied");
          }}
        >
          Copy snippet
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Live preview</h2>
        <div className="border-border overflow-hidden rounded-lg border">
          <iframe
            title="Widget preview"
            src={`/widget/${encodeURIComponent(widgetKey)}`}
            className="h-[420px] w-full bg-white"
          />
        </div>
      </section>

      <Button
        disabled={pending}
        onClick={() => {
          setPlanLimit(null);
          startTransition(async () => {
            const allowedOrigins = originsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);
            const result = await updateWidgetSettingsAction(slug, {
              color,
              greeting,
              allowedOrigins,
              showPoweredBy,
            });
            if (!result.ok) {
              if (result.error.code === "PLAN_LIMIT") {
                setPlanLimit(result.error.message);
                return;
              }
              toast.error(result.error.message);
              return;
            }
            toast.success("Widget settings saved");
            router.refresh();
          });
        }}
      >
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
