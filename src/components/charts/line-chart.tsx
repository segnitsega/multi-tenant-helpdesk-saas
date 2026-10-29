"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function VolumeLineChart({
  data,
}: {
  data: Array<{ day: string; created: number; resolved: number }>;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
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
              color: "var(--popover-foreground)",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="created"
            name="Created"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="resolved"
            name="Resolved"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            <th>Created</th>
            <th>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td>{row.created}</td>
              <td>{row.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
