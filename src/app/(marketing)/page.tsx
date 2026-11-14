import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Faq } from "@/features/marketing/components/faq";
import { FeatureGrid } from "@/features/marketing/components/feature-grid";
import { HeroInboxMock } from "@/features/marketing/components/hero-inbox-mock";
import { PricingTable } from "@/features/marketing/components/pricing-table";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsla(243,75%,59%,0.18),_transparent_55%),linear-gradient(180deg,_hsl(240_5%_98%),_hsl(0_0%_100%))] dark:bg-[radial-gradient(ellipse_at_top,_hsla(243,75%,59%,0.22),_transparent_55%),linear-gradient(180deg,_hsl(240_10%_6%),_hsl(240_10%_4%))]"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pt-16 pb-20 md:pt-24">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <p className="text-primary text-sm font-semibold tracking-[0.2em] uppercase">
              Relay
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              The shared inbox your support team actually wants to open.
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed text-pretty sm:text-lg">
              Triage email and widget conversations, hit SLAs, and keep every
              workspace isolated — without losing keyboard speed.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/demo"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Try the demo
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Start free
              </Link>
            </div>
          </div>
          <HeroInboxMock />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Why teams switch to Relay
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Fast triage, clear ownership, and analytics that stay honest about
            your plan limits.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Keyboard-first triage",
              body: "Jump tickets with j/k, assign with a, resolve with e, and search everything from ⌘K.",
            },
            {
              title: "One queue per workspace",
              body: "Invite agents, set roles, and keep customer data sealed behind Postgres RLS.",
            },
            {
              title: "Email that threads",
              body: "Inbound mail and widget chats land on the same ticket with reliable conversation history.",
            },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <h3 className="text-base font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-border/60 border-y bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Everything you need to run support
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              From first reply to SLA breach, Relay keeps the work visible.
            </p>
          </div>
          <FeatureGrid />
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Simple pricing that matches the product
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Seat, history, and analytics limits mirror what you get in the app.
          </p>
        </div>
        <PricingTable />
      </section>

      <section id="faq" className="border-border/60 border-t bg-muted/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Questions, answered
            </h2>
          </div>
          <Faq />
        </div>
      </section>
    </main>
  );
}
