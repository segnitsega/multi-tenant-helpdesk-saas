import "server-only";
import { systemDb } from "@/server/db/system";
import { withTenantDb, type DbTx } from "@/server/db";
import { NotFoundError } from "@/lib/api-error";
import {
  parseAnalyticsRange,
  previousPeriod,
  percentChange,
  type ParsedAnalyticsRange,
} from "@/lib/analytics-range";
import { planLimits } from "@/config/plans";
import { effectivePlan } from "@/lib/effective-plan";
import type { TenantContext } from "@/types/tenant";

function num(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function agentClause(agentId: string | null) {
  return {
    filter: Boolean(agentId),
    id: agentId ?? "00000000-0000-0000-0000-000000000000",
  };
}

async function loadWorkspace(workspaceId: string) {
  const workspace = await systemDb.orm.public.Workspace.where({
    id: workspaceId,
  }).first();
  if (!workspace) throw new NotFoundError("Workspace not found");
  return workspace;
}

export async function resolveAnalyticsWindow(
  ctx: Pick<TenantContext, "workspaceId">,
  input: {
    range?: string | null;
    from?: string | null;
    to?: string | null;
    agent?: string | null;
  },
) {
  const workspace = await loadWorkspace(ctx.workspaceId);
  const plan = effectivePlan(workspace);
  const limits = planLimits(plan);
  const parsed = parseAnalyticsRange(input);
  const maxDays = limits.analyticsDays;
  const locked = maxDays != null && parsed.days > maxDays;

  return {
    workspace,
    plan,
    maxDays,
    locked,
    range: parsed,
    previous: previousPeriod(parsed),
  };
}

async function ticketsCreatedCount(
  tx: DbTx,
  workspaceId: string,
  from: Date,
  to: Date,
  agent: ReturnType<typeof agentClause>,
) {
  const rows = await tx.query(
    tx.raw
      .sql`
        SELECT COUNT(*)::int AS count
        FROM tickets t
        WHERE t.workspace_id = ${workspaceId}::uuid
          AND t.merged_into_ticket_id IS NULL
          AND t.created_at >= ${from.toISOString()}::timestamptz
          AND t.created_at < ${to.toISOString()}::timestamptz
          AND (
            NOT ${agent.filter}::boolean
            OR t.assignee_membership_id = ${agent.id}::uuid
          )
      `
      .returnsRow({ count: "pg/int4@1" })
      .build(),
  );
  return num(rows[0]?.count);
}

async function medianSeconds(
  tx: DbTx,
  workspaceId: string,
  from: Date,
  to: Date,
  agent: ReturnType<typeof agentClause>,
  kind: "first_response" | "resolution",
) {
  const rows =
    kind === "first_response"
      ? await tx.query(
          tx.raw
            .sql`
              SELECT percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (t.first_response_at - t.created_at))
              )::text AS median
              FROM tickets t
              WHERE t.workspace_id = ${workspaceId}::uuid
                AND t.merged_into_ticket_id IS NULL
                AND t.created_at >= ${from.toISOString()}::timestamptz
                AND t.created_at < ${to.toISOString()}::timestamptz
                AND t.first_response_at IS NOT NULL
                AND (
                  NOT ${agent.filter}::boolean
                  OR t.assignee_membership_id = ${agent.id}::uuid
                )
            `
            .returnsRow({
              median: { codecId: "pg/text@1", nullable: true },
            })
            .build(),
        )
      : await tx.query(
          tx.raw
            .sql`
              SELECT percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))
              )::text AS median
              FROM tickets t
              WHERE t.workspace_id = ${workspaceId}::uuid
                AND t.merged_into_ticket_id IS NULL
                AND t.created_at >= ${from.toISOString()}::timestamptz
                AND t.created_at < ${to.toISOString()}::timestamptz
                AND t.resolved_at IS NOT NULL
                AND (
                  NOT ${agent.filter}::boolean
                  OR t.assignee_membership_id = ${agent.id}::uuid
                )
            `
            .returnsRow({
              median: { codecId: "pg/text@1", nullable: true },
            })
            .build(),
        );
  return numOrNull(rows[0]?.median);
}

async function slaCompliance(
  tx: DbTx,
  workspaceId: string,
  from: Date,
  to: Date,
  agent: ReturnType<typeof agentClause>,
) {
  const rows = await tx.query(
    tx.raw
      .sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE NOT t.sla_first_response_breached
              AND NOT t.sla_resolution_breached
          )::int AS ok
        FROM tickets t
        WHERE t.workspace_id = ${workspaceId}::uuid
          AND t.merged_into_ticket_id IS NULL
          AND t.created_at >= ${from.toISOString()}::timestamptz
          AND t.created_at < ${to.toISOString()}::timestamptz
          AND (
            t.sla_first_response_due_at IS NOT NULL
            OR t.sla_resolution_due_at IS NOT NULL
          )
          AND (
            NOT ${agent.filter}::boolean
            OR t.assignee_membership_id = ${agent.id}::uuid
          )
      `
      .returnsRow({ total: "pg/int4@1", ok: "pg/int4@1" })
      .build(),
  );
  const total = num(rows[0]?.total);
  const ok = num(rows[0]?.ok);
  return total === 0 ? null : (ok / total) * 100;
}

export async function getVolumeSeries(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
  timezone: string,
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const created = await tx.query(
      tx.raw
        .sql`
          SELECT
            to_char(
              date_trunc('day', t.created_at AT TIME ZONE ${timezone}),
              'YYYY-MM-DD'
            ) AS day,
            COUNT(*)::int AS count
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY 1
          ORDER BY 1
        `
        .returnsRow({ day: "pg/text@1", count: "pg/int4@1" })
        .build(),
    );
    const resolved = await tx.query(
      tx.raw
        .sql`
          SELECT
            to_char(
              date_trunc('day', t.resolved_at AT TIME ZONE ${timezone}),
              'YYYY-MM-DD'
            ) AS day,
            COUNT(*)::int AS count
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.resolved_at IS NOT NULL
            AND t.resolved_at >= ${range.from.toISOString()}::timestamptz
            AND t.resolved_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY 1
          ORDER BY 1
        `
        .returnsRow({ day: "pg/text@1", count: "pg/int4@1" })
        .build(),
    );
    const map = new Map<
      string,
      { day: string; created: number; resolved: number }
    >();
    for (const row of created) {
      map.set(row.day, { day: row.day, created: num(row.count), resolved: 0 });
    }
    for (const row of resolved) {
      const existing = map.get(row.day) ?? {
        day: row.day,
        created: 0,
        resolved: 0,
      };
      existing.resolved = num(row.count);
      map.set(row.day, existing);
    }
    return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
  });
}

export async function getStatusBreakdown(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT t.status::text AS status, COUNT(*)::int AS count
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY t.status
          ORDER BY count DESC
        `
        .returnsRow({ status: "pg/text@1", count: "pg/int4@1" })
        .build(),
    );
    return rows.map((row) => ({ status: row.status, count: num(row.count) }));
  });
}

export async function getChannelBreakdown(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT t.channel::text AS channel, COUNT(*)::int AS count
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY t.channel
          ORDER BY count DESC
        `
        .returnsRow({ channel: "pg/text@1", count: "pg/int4@1" })
        .build(),
    );
    return rows.map((row) => ({ channel: row.channel, count: num(row.count) }));
  });
}

export async function getTagBreakdown(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT tg.name, COUNT(*)::int AS count
          FROM ticket_tags tt
          INNER JOIN tags tg ON tg.id = tt.tag_id
          INNER JOIN tickets t ON t.id = tt.ticket_id
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY tg.name
          ORDER BY count DESC
          LIMIT 12
        `
        .returnsRow({ name: "pg/text@1", count: "pg/int4@1" })
        .build(),
    );
    return rows.map((row) => ({ name: row.name, count: num(row.count) }));
  });
}

export async function getBusiestHours(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
  timezone: string,
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT
            EXTRACT(DOW FROM t.created_at AT TIME ZONE ${timezone})::int AS dow,
            EXTRACT(HOUR FROM t.created_at AT TIME ZONE ${timezone})::int AS hour,
            COUNT(*)::int AS count
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
            AND (
              NOT ${agent.filter}::boolean
              OR t.assignee_membership_id = ${agent.id}::uuid
            )
          GROUP BY 1, 2
          ORDER BY 1, 2
        `
        .returnsRow({
          dow: "pg/int4@1",
          hour: "pg/int4@1",
          count: "pg/int4@1",
        })
        .build(),
    );
    return rows.map((row) => ({
      dow: num(row.dow),
      hour: num(row.hour),
      count: num(row.count),
    }));
  });
}

export async function getAgentStats(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.query(
      tx.raw
        .sql`
          SELECT
            t.assignee_membership_id AS "assigneeMembershipId",
            COUNT(*)::int AS assigned,
            COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL)::int AS resolved,
            (
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (t.first_response_at - t.created_at))
              ) FILTER (WHERE t.first_response_at IS NOT NULL)
            )::text AS "medianFirstResponse",
            COUNT(*) FILTER (
              WHERE (
                t.sla_first_response_due_at IS NOT NULL
                OR t.sla_resolution_due_at IS NOT NULL
              )
              AND NOT t.sla_first_response_breached
              AND NOT t.sla_resolution_breached
            )::int AS "slaOk",
            COUNT(*) FILTER (
              WHERE t.sla_first_response_due_at IS NOT NULL
                OR t.sla_resolution_due_at IS NOT NULL
            )::int AS "slaTotal"
          FROM tickets t
          WHERE t.workspace_id = ${ctx.workspaceId}::uuid
            AND t.merged_into_ticket_id IS NULL
            AND t.assignee_membership_id IS NOT NULL
            AND t.created_at >= ${range.from.toISOString()}::timestamptz
            AND t.created_at < ${range.to.toISOString()}::timestamptz
          GROUP BY t.assignee_membership_id
        `
        .returnsRow({
          assigneeMembershipId: "pg/uuid@1",
          assigned: "pg/int4@1",
          resolved: "pg/int4@1",
          medianFirstResponse: { codecId: "pg/text@1", nullable: true },
          slaOk: "pg/int4@1",
          slaTotal: "pg/int4@1",
        })
        .build(),
    );

    return rows.map((row) => {
      const slaTotal = num(row.slaTotal);
      return {
        assigneeMembershipId: row.assigneeMembershipId,
        assigned: num(row.assigned),
        resolved: num(row.resolved),
        medianFirstResponseSeconds: numOrNull(row.medianFirstResponse),
        slaCompliancePercent:
          slaTotal === 0 ? null : (num(row.slaOk) / slaTotal) * 100,
      };
    });
  });
}

export async function getAnalyticsKpis(
  ctx: Pick<TenantContext, "workspaceId">,
  range: ParsedAnalyticsRange,
  previous: { from: Date; to: Date },
) {
  const agent = agentClause(range.agentId);
  return withTenantDb(ctx, async (tx) => {
    const [
      created,
      prevCreated,
      medianFrt,
      prevMedianFrt,
      medianResolution,
      prevMedianResolution,
      sla,
      prevSla,
    ] = await Promise.all([
      ticketsCreatedCount(tx, ctx.workspaceId, range.from, range.to, agent),
      ticketsCreatedCount(
        tx,
        ctx.workspaceId,
        previous.from,
        previous.to,
        agent,
      ),
      medianSeconds(
        tx,
        ctx.workspaceId,
        range.from,
        range.to,
        agent,
        "first_response",
      ),
      medianSeconds(
        tx,
        ctx.workspaceId,
        previous.from,
        previous.to,
        agent,
        "first_response",
      ),
      medianSeconds(
        tx,
        ctx.workspaceId,
        range.from,
        range.to,
        agent,
        "resolution",
      ),
      medianSeconds(
        tx,
        ctx.workspaceId,
        previous.from,
        previous.to,
        agent,
        "resolution",
      ),
      slaCompliance(tx, ctx.workspaceId, range.from, range.to, agent),
      slaCompliance(tx, ctx.workspaceId, previous.from, previous.to, agent),
    ]);

    return {
      ticketsCreated: {
        value: created,
        change: percentChange(created, prevCreated),
      },
      medianFirstResponseSeconds: {
        value: medianFrt,
        change:
          medianFrt == null || prevMedianFrt == null
            ? null
            : percentChange(medianFrt, prevMedianFrt),
      },
      medianResolutionSeconds: {
        value: medianResolution,
        change:
          medianResolution == null || prevMedianResolution == null
            ? null
            : percentChange(medianResolution, prevMedianResolution),
      },
      slaCompliancePercent: {
        value: sla,
        change:
          sla == null || prevSla == null ? null : percentChange(sla, prevSla),
      },
    };
  });
}

export async function getAnalyticsDashboard(
  ctx: TenantContext,
  input: {
    range?: string | null;
    from?: string | null;
    to?: string | null;
    agent?: string | null;
  },
) {
  const window = await resolveAnalyticsWindow(ctx, input);
  if (window.locked) {
    return {
      locked: true as const,
      plan: window.plan,
      maxDays: window.maxDays,
      range: window.range,
    };
  }

  const timezone = window.workspace.timezone || "UTC";
  const [kpis, volume, byStatus, byChannel, byTag, heatmap, agents] =
    await Promise.all([
      getAnalyticsKpis(ctx, window.range, window.previous),
      getVolumeSeries(ctx, window.range, timezone),
      getStatusBreakdown(ctx, window.range),
      getChannelBreakdown(ctx, window.range),
      getTagBreakdown(ctx, window.range),
      getBusiestHours(ctx, window.range, timezone),
      getAgentStats(ctx, window.range),
    ]);

  const members = await systemDb.orm.public.Membership.where({
    workspaceId: ctx.workspaceId,
  }).all();
  const users = await Promise.all(
    members.map((m) => systemDb.orm.public.User.where({ id: m.userId }).first()),
  );
  const memberNames = new Map(
    members.map((m, i) => [
      m.id,
      users[i]?.name?.trim() || users[i]?.email || "Agent",
    ]),
  );

  return {
    locked: false as const,
    plan: window.plan,
    maxDays: window.maxDays,
    range: window.range,
    timezone,
    kpis,
    volume,
    byStatus,
    byChannel,
    byTag,
    heatmap,
    agents: agents
      .map((row) => ({
        ...row,
        name: memberNames.get(row.assigneeMembershipId) ?? "Agent",
      }))
      .sort((a, b) => b.assigned - a.assigned),
  };
}

export function analyticsDashboardToCsv(
  data: Exclude<
    Awaited<ReturnType<typeof getAnalyticsDashboard>>,
    { locked: true }
  >,
): string {
  const lines: string[] = [];
  lines.push("section,key,value");
  lines.push(`kpi,tickets_created,${data.kpis.ticketsCreated.value}`);
  lines.push(
    `kpi,median_first_response_seconds,${data.kpis.medianFirstResponseSeconds.value ?? ""}`,
  );
  lines.push(
    `kpi,median_resolution_seconds,${data.kpis.medianResolutionSeconds.value ?? ""}`,
  );
  lines.push(
    `kpi,sla_compliance_percent,${data.kpis.slaCompliancePercent.value ?? ""}`,
  );
  for (const row of data.volume) {
    lines.push(
      `volume,${row.day},created=${row.created};resolved=${row.resolved}`,
    );
  }
  for (const row of data.byStatus) {
    lines.push(`status,${row.status},${row.count}`);
  }
  for (const row of data.byChannel) {
    lines.push(`channel,${row.channel},${row.count}`);
  }
  for (const row of data.byTag) {
    lines.push(`tag,${row.name},${row.count}`);
  }
  for (const row of data.agents) {
    lines.push(
      `agent,${JSON.stringify(row.name)},assigned=${row.assigned};resolved=${row.resolved};median_frt=${row.medianFirstResponseSeconds ?? ""};sla=${row.slaCompliancePercent ?? ""}`,
    );
  }
  return `${lines.join("\n")}\n`;
}
