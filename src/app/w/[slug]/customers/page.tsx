import Link from "next/link";
import { getTenantContext } from "@/server/tenancy/context";
import { listCustomers } from "@/server/services/customer.service";
import { listTickets } from "@/server/services/ticket.service";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  const customers = await listCustomers(ctx, { limit: 100 });
  const tickets = await listTickets(ctx, { limit: 100 });

  const openByCustomer = new Map<string, number>();
  for (const ticket of tickets.items) {
    if (ticket.status === "OPEN" || ticket.status === "PENDING") {
      openByCustomer.set(
        ticket.customerId,
        (openByCustomer.get(ticket.customerId) ?? 0) + 1,
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        People who have contacted this workspace.
      </p>
      <div className="border-border mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Open tickets</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-border border-t">
                <td className="px-3 py-2">
                  <Link
                    href={`/w/${slug}/customers/${customer.id}`}
                    className="text-foreground font-medium hover:underline"
                  >
                    {customer.name || "—"}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {customer.email}
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">
                  {openByCustomer.get(customer.id) ?? 0}
                </td>
              </tr>
            ))}
            {customers.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="text-muted-foreground px-3 py-8 text-center"
                >
                  No customers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
