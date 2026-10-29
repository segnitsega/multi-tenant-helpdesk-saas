"use client";

import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HoursHeatmap({
  data,
}: {
  data: Array<{ dow: number; hour: number; count: number }>;
}) {
  const max = Math.max(1, ...data.map((row) => row.count));
  const lookup = new Map(data.map((row) => [`${row.dow}-${row.hour}`, row.count]));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-1">
          <div />
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="text-muted-foreground text-center text-[10px] tabular-nums"
            >
              {hour}
            </div>
          ))}
          {DAYS.map((label, dow) => (
            <div key={label} className="contents">
              <div className="text-muted-foreground pr-2 text-xs">{label}</div>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = lookup.get(`${dow}-${hour}`) ?? 0;
                const intensity = count / max;
                return (
                  <div
                    key={`${dow}-${hour}`}
                    title={`${label} ${hour}:00 — ${count}`}
                    className={cn(
                      "border-border aspect-square rounded-sm border",
                      count === 0 && "bg-muted/40",
                    )}
                    style={
                      count === 0
                        ? undefined
                        : {
                            backgroundColor: `color-mix(in oklch, var(--chart-1) ${Math.max(18, intensity * 100)}%, transparent)`,
                          }
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            <th>Hour</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={`${row.dow}-${row.hour}`}>
              <td>{DAYS[row.dow]}</td>
              <td>{row.hour}</td>
              <td>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
