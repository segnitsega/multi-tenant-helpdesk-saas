import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { getCustomer } from "@/server/services/customer.service";
import { listTickets } from "@/server/services/ticket.service";
import { NotFoundError } from "@/lib/api-error";
import { StatusBadge, type TicketStatus } from "@/components/status-badge";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await getTenantContext(slug);

  let customer;
  try {
    customer = await getCustomer(ctx, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const tickets = await listTickets(ctx, { limit: 100 });
  const theirs = tickets.items.filter((row) => row.customerId === id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href={`/w/${slug}/customers`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Customers
      </Link>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {customer.name || customer.email}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">{customer.email}</p>

      <h2 className="mt-8 text-sm font-semibold tracking-wide uppercase">
        Ticket history
      </h2>
      <ul className="border-border mt-3 divide-y rounded-lg border">
        {theirs.map((ticket) => (
          <li key={ticket.id}>
            <Link
              href={`/w/${slug}/inbox/${ticket.number}`}
              className="hover:bg-muted/50 flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  #{ticket.number} {ticket.subject}
                </p>
              </div>
              <StatusBadge status={ticket.status as TicketStatus} />
            </Link>
          </li>
        ))}
        {theirs.length === 0 ? (
          <li className="text-muted-foreground px-3 py-6 text-center text-sm">
            No tickets for this customer.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
