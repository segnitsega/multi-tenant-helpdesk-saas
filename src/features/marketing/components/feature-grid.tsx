import {
  Inbox,
  Keyboard,
  LineChart,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Inbox,
    title: "Shared inbox",
    body: "Email, widget, and manual tickets in one keyboard-first queue.",
  },
  {
    icon: Mail,
    title: "Email threading",
    body: "Inbound replies land on the right ticket with reliable Message-ID matching.",
  },
  {
    icon: Sparkles,
    title: "SLA & automations",
    body: "Timers, breach alerts, and rules that assign or tag without busywork.",
  },
  {
    icon: LineChart,
    title: "Analytics that matter",
    body: "Volume, response times, and SLA health with plan-aware history windows.",
  },
  {
    icon: Keyboard,
    title: "Built for speed",
    body: "Command palette, j/k navigation, and composer shortcuts stay out of the way.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolation",
    body: "Postgres RLS keeps every workspace's data sealed from the others.",
  },
];

export function FeatureGrid() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature) => {
        const Icon = feature.icon;
        return (
          <div key={feature.title} className="space-y-3">
            <div className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
              <Icon className="size-5" aria-hidden />
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              {feature.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {feature.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
