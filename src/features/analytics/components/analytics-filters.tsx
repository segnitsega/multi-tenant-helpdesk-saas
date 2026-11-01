"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AnalyticsFilters({
  slug,
  agents,
  range,
  from,
  to,
  agentId,
}: {
  slug: string;
  agents: Array<{ id: string; name: string }>;
  range: string;
  from: string;
  to: string;
  agentId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">Range</label>
        <Select
          value={range}
          disabled={pending}
          onValueChange={(value) => {
            if (!value) return;
            if (value === "custom") {
              update({ range: "custom", from, to });
              return;
            }
            update({ range: value, from: null, to: null });
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {range === "custom" ? (
        <>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium" htmlFor="from">
              From
            </label>
            <Input
              id="from"
              type="date"
              className="w-40"
              defaultValue={from}
              disabled={pending}
              onChange={(e) => update({ range: "custom", from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs font-medium" htmlFor="to">
              To
            </label>
            <Input
              id="to"
              type="date"
              className="w-40"
              defaultValue={to}
              disabled={pending}
              onChange={(e) => update({ range: "custom", to: e.target.value })}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">Agent</label>
        <Select
          value={agentId ?? "all"}
          disabled={pending}
          onValueChange={(value) => {
            if (!value || value === "all") update({ agent: null });
            else update({ agent: value });
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        disabled={pending}
        render={
          <a
            href={`/api/w/${slug}/export/analytics?${searchParams.toString()}`}
          />
        }
      >
        Export CSV
      </Button>
    </div>
  );
}
