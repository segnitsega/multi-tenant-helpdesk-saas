import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Relay. Shared inbox for modern teams.</p>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
          <Link href="/signup" className="hover:text-foreground">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
