import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerSession } from "@/server/auth/customer-session";
import {
  assertPortalCustomer,
  getPortalTicket,
} from "@/server/services/portal.service";
import { PortalTicketThread } from "@/features/portal/components/portal-ticket-thread";
import { Button } from "@/components/ui/button";
import { ForbiddenError, NotFoundError } from "@/lib/api-error";

export default async function PortalTicketPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number: numberRaw } = await params;
  const number = Number(numberRaw);
  if (!Number.isFinite(number)) notFound();

  const session = await getCustomerSession("portal");
  if (!session) redirect(`/portal/${slug}`);

  try {
    const ctx = await assertPortalCustomer(slug, session);
    const data = await getPortalTicket(ctx, number);
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 px-0"
              render={<Link href={`/portal/${slug}`} />}
            >
              ← All requests
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              #{data.ticket.number} {data.ticket.subject}
            </h1>
            <p className="text-muted-foreground text-sm">{data.ticket.status}</p>
          </div>
        </div>
        <PortalTicketThread
          slug={slug}
          number={number}
          messages={data.messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect(`/portal/${slug}`);
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
