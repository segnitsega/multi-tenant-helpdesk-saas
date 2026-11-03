import { Suspense } from "react";
import { getTenantContext } from "@/server/tenancy/context";
import { listMembers } from "@/server/services/membership.service";
import { getAnalyticsDashboard } from "@/server/services/analytics.service";
import { AnalyticsDashboard } from "@/features/analytics/components/analytics-dashboard";
import { AnalyticsSkeleton } from "@/features/analytics/components/analytics-skeleton";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const ctx = await getTenantContext(slug);

  const range = typeof query.range === "string" ? query.range : undefined;
  const from = typeof query.from === "string" ? query.from : undefined;
  const to = typeof query.to === "string" ? query.to : undefined;
  const agent = typeof query.agent === "string" ? query.agent : undefined;

  const [data, members] = await Promise.all([
    getAnalyticsDashboard(ctx, { range, from, to, agent }),
    listMembers(ctx.workspaceId),
  ]);

  const agents = members.map((m) => ({
    id: m.id,
    name: m.name?.trim() || m.email,
  }));

  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsDashboard slug={slug} data={data} agents={agents} />
    </Suspense>
  );
}
