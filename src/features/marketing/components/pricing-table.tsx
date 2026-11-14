import Link from "next/link";
import { PLANS, type PlanId } from "@/config/plans";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLAN_META: Record<
  PlanId,
  { name: string; price: string; blurb: string; cta: string; featured?: boolean }
> = {
  FREE: {
    name: "Free",
    price: "$0",
    blurb: "For solo founders trying Relay on a small queue.",
    cta: "Start free",
  },
  PRO: {
    name: "Pro",
    price: "$29",
    blurb: "For growing support teams that need SLA and automations.",
    cta: "Start Pro trial",
    featured: true,
  },
  BUSINESS: {
    name: "Business",
    price: "$79",
    blurb: "For larger teams that need longer history and more seats.",
    cta: "Talk to sales",
  },
};

function limitLabel(plan: PlanId, key: keyof (typeof PLANS)[PlanId]) {
  const value = PLANS[plan][key];
  if (value === null) return "Unlimited";
  if (typeof value === "boolean") return value ? "Included" : "—";
  return String(value);
}

export function PricingTable({
  className,
  ctaHref = "/signup",
}: {
  className?: string;
  ctaHref?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-3",
        className,
      )}
    >
      {(Object.keys(PLANS) as PlanId[]).map((plan) => {
        const meta = PLAN_META[plan];
        const limits = PLANS[plan];
        return (
          <div
            key={plan}
            className={cn(
              "border-border flex flex-col rounded-2xl border p-6",
              meta.featured && "border-primary shadow-sm",
            )}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium tracking-wide uppercase">
                {meta.name}
              </p>
              <p className="text-3xl font-semibold tracking-tight">
                {meta.price}
                <span className="text-muted-foreground text-sm font-normal">
                  /mo
                </span>
              </p>
              <p className="text-muted-foreground text-sm">{meta.blurb}</p>
            </div>
            <ul className="text-muted-foreground mt-6 space-y-2 text-sm">
              <li>{limitLabel(plan, "seats")} seats</li>
              <li>
                {limits.historyDays == null
                  ? "Unlimited"
                  : `${limits.historyDays} days`}{" "}
                ticket history
              </li>
              <li>
                {limits.analyticsDays} days analytics
              </li>
              <li>
                Automations:{" "}
                {limits.automations == null
                  ? "Unlimited"
                  : limits.automations === 0
                    ? "Not included"
                    : limits.automations}
              </li>
              <li>SLA policies: {limits.sla ? "Yes" : "No"}</li>
              <li>Embeddable widget: {limits.widget ? "Yes" : "No"}</li>
            </ul>
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants({
                  variant: meta.featured ? "default" : "outline",
                }),
                "mt-8",
              )}
            >
              {meta.cta}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
