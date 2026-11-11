import { notFound } from "next/navigation";
import { getTenantContext } from "@/server/tenancy/context";
import { getTicketByNumberQuery } from "@/server/queries/tickets";
import { TicketDetail } from "@/features/tickets/components/ticket-detail";
import { NotFoundError } from "@/lib/api-error";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number: numberRaw } = await params;
  const number = Number(numberRaw);
  if (!Number.isFinite(number) || number <= 0) notFound();

  const ctx = await getTenantContext(slug);

  try {
    const detail = await getTicketByNumberQuery(ctx, number);
    return (
      <TicketDetail slug={slug} detail={detail} readonly={ctx.readonly} />
    );
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
