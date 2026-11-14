import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PricingTable } from "@/features/marketing/components/pricing-table";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing · Relay",
  description: "Relay plan limits for Free, Pro, and Business.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Every plan includes the shared inbox. Higher tiers unlock SLA,
          automations, widget embedding, and longer analytics history.
        </p>
        <Link
          href="/demo"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Explore the demo workspace
        </Link>
      </div>
      <PricingTable />
    </main>
  );
}
