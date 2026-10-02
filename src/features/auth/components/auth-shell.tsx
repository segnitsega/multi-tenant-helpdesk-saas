import Link from "next/link";

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
    <div className="bg-muted/40 flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-foreground text-2xl font-semibold tracking-tight"
          >
            Relay
          </Link>
          <h1 className="mt-6 text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground mt-2 text-sm">{description}</p>
          ) : null}
        </div>
        <div className="border-border bg-card rounded-lg border p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
