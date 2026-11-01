"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDurationSeconds } from "@/lib/analytics-range";
import { Button } from "@/components/ui/button";

type AgentRow = {
  assigneeMembershipId: string;
  name: string;
  assigned: number;
  resolved: number;
  medianFirstResponseSeconds: number | null;
  slaCompliancePercent: number | null;
};

type SortKey = "name" | "assigned" | "resolved" | "medianFirstResponseSeconds" | "slaCompliancePercent";

export function AgentTable({ rows }: { rows: AgentRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("assigned");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return dir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [rows, sortKey, dir]);

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDir(key === "name" ? "asc" : "desc");
  }

  function head(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto px-0 font-medium"
        onClick={() => toggle(key)}
      >
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </Button>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No assigned tickets in this range.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{head("Agent", "name")}</TableHead>
          <TableHead>{head("Assigned", "assigned")}</TableHead>
          <TableHead>{head("Resolved", "resolved")}</TableHead>
          <TableHead>{head("Median FRT", "medianFirstResponseSeconds")}</TableHead>
          <TableHead>{head("SLA", "slaCompliancePercent")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={row.assigneeMembershipId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="tabular-nums">{row.assigned}</TableCell>
            <TableCell className="tabular-nums">{row.resolved}</TableCell>
            <TableCell className="tabular-nums">
              {formatDurationSeconds(row.medianFirstResponseSeconds)}
            </TableCell>
            <TableCell className="tabular-nums">
              {row.slaCompliancePercent == null
                ? "—"
                : `${row.slaCompliancePercent.toFixed(0)}%`}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
