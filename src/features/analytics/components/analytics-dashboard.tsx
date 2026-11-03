import {
  ChannelBarChart,
  HoursHeatmap,
  KpiCard,
  StatusBarChart,
  VolumeLineChart,
} from "@/components/charts";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { EmptyState } from "@/components/empty-state";
import { formatDurationSeconds } from "@/lib/analytics-range";
import { AnalyticsFilters } from "@/features/analytics/components/analytics-filters";
import { AgentTable } from "@/features/analytics/components/agent-table";
import type { getAnalyticsDashboard } from "@/server/services/analytics.service";

type Dashboard = Awaited<ReturnType<typeof getAnalyticsDashboard>>;

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function AnalyticsDashboard({
  slug,
  data,
  agents,
}: {
  slug: string;
  data: Dashboard;
  agents: Array<{ id: string; name: string }>;
}) {
  const from = toDateInput(data.range.from);
  const to = toDateInput(new Date(data.range.to.getTime() - 1));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Volume, response times, and SLA health for this workspace.
          </p>
        </div>
        <AnalyticsFilters
          slug={slug}
          agents={agents}
          range={data.range.preset}
          from={from}
          to={to}
          agentId={data.range.agentId}
        />
      </div>

      {data.locked ? (
        <UpgradePrompt
          slug={slug}
          title="Range locked on your plan"
          description={`Your ${data.plan} plan includes ${data.maxDays ?? 0} days of analytics. Choose a shorter range or upgrade.`}
        />
      ) : (
        <AnalyticsDashboardBody data={data} />
      )}
    </div>
  );
}

function AnalyticsDashboardBody({
  data,
}: {
  data: Extract<Dashboard, { locked: false }>;
}) {
  const empty =
    data.kpis.ticketsCreated.value === 0 && data.volume.length === 0;

  if (empty) {
    return (
      <EmptyState
        title="No tickets in this range"
        description="Try a wider date range or seed the demo workspace."
        className="border-border rounded-lg border border-dashed py-16"
      />
    );
  }

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tickets created"
          value={String(data.kpis.ticketsCreated.value)}
          change={data.kpis.ticketsCreated.change}
        />
        <KpiCard
          label="Median first response"
          value={formatDurationSeconds(data.kpis.medianFirstResponseSeconds.value)}
          change={data.kpis.medianFirstResponseSeconds.change}
          invertChange
        />
        <KpiCard
          label="Median resolution"
          value={formatDurationSeconds(data.kpis.medianResolutionSeconds.value)}
          change={data.kpis.medianResolutionSeconds.change}
          invertChange
        />
        <KpiCard
          label="SLA compliance"
          value={
            data.kpis.slaCompliancePercent.value == null
              ? "—"
              : `${data.kpis.slaCompliancePercent.value.toFixed(0)}%`
          }
          change={data.kpis.slaCompliancePercent.change}
        />
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Ticket volume</h2>
        <VolumeLineChart data={data.volume} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border-border space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">By status</h2>
          <StatusBarChart data={data.byStatus} />
        </div>
        <div className="border-border space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">By channel</h2>
          <ChannelBarChart data={data.byChannel} />
        </div>
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Busiest hours</h2>
        <HoursHeatmap data={data.heatmap} />
      </section>

      {data.byTag.length > 0 ? (
        <section className="border-border space-y-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Top tags</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.byTag.map((tag) => (
              <li
                key={tag.name}
                className="text-muted-foreground flex items-center justify-between text-sm"
              >
                <span className="text-foreground">{tag.name}</span>
                <span className="tabular-nums">{tag.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Agents</h2>
        <AgentTable rows={data.agents} />
      </section>
    </>
  );
}
