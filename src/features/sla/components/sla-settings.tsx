"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { upsertSlaPolicyAction } from "@/features/sla/actions";

export type SlaPolicyRow = {
  id: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  firstResponseMinutes: number;
  resolutionMinutes: number;
  enabled: boolean;
};

export function SlaSettings({
  slug,
  policies,
}: {
  slug: string;
  policies: SlaPolicyRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(policies);

  function updateRow(
    priority: SlaPolicyRow["priority"],
    patch: Partial<SlaPolicyRow>,
  ) {
    setRows((prev) =>
      prev.map((row) => (row.priority === priority ? { ...row, ...patch } : row)),
    );
  }

  function save(row: SlaPolicyRow) {
    startTransition(async () => {
      const result = await upsertSlaPolicyAction(slug, {
        priority: row.priority,
        firstResponseMinutes: row.firstResponseMinutes,
        resolutionMinutes: row.resolutionMinutes,
        enabled: row.enabled,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${row.priority} SLA saved`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Targets are measured from ticket creation. Warning state starts at 50%
        of the remaining window.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            <TableHead>First response (min)</TableHead>
            <TableHead>Resolution (min)</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.priority}>
              <TableCell className="font-medium">{row.priority}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  value={row.firstResponseMinutes}
                  onChange={(event) =>
                    updateRow(row.priority, {
                      firstResponseMinutes: Number(event.target.value) || 1,
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={1}
                  value={row.resolutionMinutes}
                  onChange={(event) =>
                    updateRow(row.priority, {
                      resolutionMinutes: Number(event.target.value) || 1,
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={row.enabled}
                  onCheckedChange={(checked) =>
                    updateRow(row.priority, { enabled: Boolean(checked) })
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => save(row)}
                >
                  Save
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
