import Link from "next/link";
import { notFound } from "next/navigation";
import { systemDb } from "@/server/db/system";
import { getCustomerSession } from "@/server/auth/customer-session";
import {
  assertPortalCustomer,
  listPortalTickets,
} from "@/server/services/portal.service";
import { PortalLoginForm } from "@/features/portal/components/portal-login-form";
import { portalSignOutAction } from "@/features/portal/actions";
import { Button } from "@/components/ui/button";
import { ForbiddenError } from "@/lib/api-error";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workspace = await systemDb.orm.public.Workspace.where({ slug }).first();
  if (!workspace) notFound();

  const session = await getCustomerSession("portal");
  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground text-sm">{workspace.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Support portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Enter your email and we will send a one-time sign-in link.
          </p>
        </div>
        <PortalLoginForm slug={slug} />
      </div>
    );
  }

  let ctx;
  try {
    ctx = await assertPortalCustomer(slug, session);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return (
        <div className="space-y-4">
          <p className="text-sm">Your session is no longer valid.</p>
          <form action={portalSignOutAction.bind(null, slug)}>
            <Button type="submit">Sign in again</Button>
          </form>
        </div>
      );
    }
    throw error;
  }

  const tickets = await listPortalTickets(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">{workspace.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your requests</h1>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href={`/portal/${slug}/new`} />} size="sm">
            New request
          </Button>
          <form action={portalSignOutAction.bind(null, slug)}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <ul className="divide-border divide-y">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/portal/${slug}/tickets/${ticket.number}`}
                className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    #{ticket.number} {ticket.subject}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {ticket.status} ·{" "}
                    {ticket.lastMessageAt.toLocaleString()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {tickets.length === 0 ? (
            <li className="text-muted-foreground px-4 py-8 text-sm">
              No requests yet. Create one to get started.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
