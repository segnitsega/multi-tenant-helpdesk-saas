import Link from "next/link";
import { getTenantContext } from "@/server/tenancy/context";
import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { can } from "@/config/can";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-border flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href={`/w/${slug}`} className="text-sm font-semibold">
            Relay
          </Link>
          <nav className="text-muted-foreground flex gap-3 text-sm">
            <Link href={`/w/${slug}`} className="hover:text-foreground">
              Inbox
            </Link>
            {can(ctx.role, "member.manage", ctx.readonly) ? (
              <Link
                href={`/w/${slug}/settings/team`}
                className="hover:text-foreground"
              >
                Team
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase">
            {ctx.role}
          </span>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
