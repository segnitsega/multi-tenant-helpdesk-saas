import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const highlights = [
  {
    title: "Keyboard-first triage",
    body: "Jump, assign, and resolve without leaving the keyboard.",
  },
  {
    title: "One inbox per workspace",
    body: "Email and widget conversations stay isolated by tenant.",
  },
  {
    title: "SLAs you can trust",
    body: "First-response and resolution targets stay visible on every ticket.",
  },
] as const;

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_hsla(243,75%,59%,0.14),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_hsla(217,91%,55%,0.08),_transparent_45%),linear-gradient(180deg,_hsl(240_5%_98%),_hsl(0_0%_100%))] dark:bg-[radial-gradient(ellipse_at_top_left,_hsla(243,75%,59%,0.2),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_hsla(217,91%,55%,0.1),_transparent_45%),linear-gradient(180deg,_hsl(240_10%_6%),_hsl(240_10%_3.5%))]"
      />
      <div
        aria-hidden
        className="border-border/40 pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(240_6%_90%/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(240_6%_90%/0.35)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_center,black_35%,transparent_75%)] dark:bg-[linear-gradient(to_right,hsl(240_4%_20%/0.45)_1px,transparent_1px),linear-gradient(to_bottom,hsl(240_4%_20%/0.45)_1px,transparent_1px)]"
      />

      <aside className="border-border/60 relative hidden w-[46%] flex-col justify-between border-r px-10 py-10 lg:flex xl:px-14">
        <Link
          href="/"
          className="animate-in fade-in slide-in-from-left-2 text-foreground text-2xl font-semibold tracking-tight duration-500 fill-mode-both"
        >
          Relay
        </Link>

        <div className="animate-in fade-in slide-in-from-left-2 space-y-10 duration-700 fill-mode-both">
          <div className="space-y-4">
            <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
              Shared inbox
            </p>
            <h2 className="text-foreground max-w-md text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
              The support workspace your team actually wants to open.
            </h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Triage email and widget conversations, hit SLAs, and keep every
              customer thread in one place.
            </p>
          </div>

          <ul className="max-w-sm space-y-5">
            {highlights.map((item) => (
              <li key={item.title} className="space-y-1">
                <p className="text-foreground text-sm font-medium">
                  {item.title}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground animate-in fade-in text-xs duration-1000 fill-mode-both">
          Built for multi-tenant teams · Postgres RLS isolation
        </p>
      </aside>

      <div className="relative flex min-h-full flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="text-foreground text-lg font-semibold tracking-tight lg:invisible"
          >
            Relay
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-[380px] duration-500 fill-mode-both">
            <div className="mb-8 space-y-2">
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              {description ? (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              ) : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
