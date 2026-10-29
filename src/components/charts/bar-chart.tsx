"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function StatusBarChart({
  data,
}: {
  data: Array<{ status: string; count: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="status"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="count" name="Tickets" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.status}>
              <td>{row.status}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChannelBarChart({
  data,
}: {
  data: Array<{ channel: string; count: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="channel"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="count" name="Tickets" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Channel</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.channel}>
              <td>{row.channel}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
