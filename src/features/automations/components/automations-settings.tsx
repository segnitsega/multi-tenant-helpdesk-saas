"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/features/auth/components/field";
import {
  createAutomationRuleAction,
  deleteAutomationRuleAction,
  reorderAutomationRulesAction,
  testAutomationRuleAction,
  updateAutomationRuleAction,
} from "@/features/automations/actions";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConditions,
} from "@/lib/automation-evaluator";

export type AutomationRuleRow = {
  id: string;
  name: string;
  trigger: "ticket.created" | "message.created";
  conditions: AutomationConditions;
  actions: AutomationAction[];
  enabled: boolean;
  position: number;
};

type DraftAction =
  | { type: "set_priority"; value: "LOW" | "NORMAL" | "HIGH" | "URGENT" }
  | {
      type: "set_status";
      value: "OPEN" | "PENDING" | "ON_HOLD" | "RESOLVED" | "CLOSED";
    }
  | { type: "add_tag"; tagName: string }
  | { type: "assign"; strategy: "round_robin" };

const emptyCondition = (): AutomationCondition => ({
  field: "subject",
  op: "contains",
  value: "",
});

type DraftState = {
  name: string;
  trigger: "ticket.created" | "message.created";
  mode: "all" | "any";
  conditions: AutomationCondition[];
  actions: DraftAction[];
  enabled: boolean;
};

const emptyDraft = (): DraftState => ({
  name: "",
  trigger: "ticket.created",
  mode: "all",
  conditions: [emptyCondition()],
  actions: [{ type: "set_priority", value: "HIGH" }],
  enabled: true,
});

export function AutomationsSettings({
  slug,
  rules,
}: {
  slug: string;
  rules: AutomationRuleRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [testNumber, setTestNumber] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const ordered = useMemo(
    () => [...rules].sort((a, b) => a.position - b.position),
    [rules],
  );

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setTestResult(null);
    setOpen(true);
  }

  function openEdit(row: AutomationRuleRow) {
    setEditingId(row.id);
    setDraft({
      name: row.name,
      trigger: row.trigger,
      mode: row.conditions.mode,
      conditions: row.conditions.conditions.length
        ? row.conditions.conditions
        : [emptyCondition()],
      actions: row.actions.length
        ? (row.actions as DraftAction[])
        : [{ type: "set_priority", value: "HIGH" }],
      enabled: row.enabled,
    });
    setTestResult(null);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const payload = {
        name: draft.name,
        trigger: draft.trigger,
        conditions: {
          mode: draft.mode,
          conditions: draft.conditions,
        },
        actions: draft.actions,
        enabled: draft.enabled,
      };
      const result = editingId
        ? await updateAutomationRuleAction(slug, { id: editingId, ...payload })
        : await createAutomationRuleAction(slug, payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setOpen(false);
      toast.success(editingId ? "Rule updated" : "Rule created");
      router.refresh();
    });
  }

  function move(id: string, direction: -1 | 1) {
    const ids = ordered.map((row) => row.id);
    const index = ids.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const copy = [...ids];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    startTransition(async () => {
      const result = await reorderAutomationRulesAction(slug, {
        orderedIds: copy,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Rules run in order on ticket creation and customer messages. Changes
          made by automations do not re-trigger rules.
        </p>
        <Button disabled={pending} onClick={openCreate}>
          <Plus className="size-4" />
          New rule
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead className="w-56">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell className="font-mono text-xs">{row.trigger}</TableCell>
              <TableCell>
                <Switch
                  checked={row.enabled}
                  disabled={pending}
                  onCheckedChange={(checked) => {
                    startTransition(async () => {
                      const result = await updateAutomationRuleAction(slug, {
                        id: row.id,
                        enabled: Boolean(checked),
                      });
                      if (!result.ok) {
                        toast.error(result.error.message);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                />
              </TableCell>
              <TableCell className="space-x-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending || index === 0}
                  onClick={() => move(row.id, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending || index === ordered.length - 1}
                  onClick={() => move(row.id, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openEdit(row)}
                >
                  Edit
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deleteAutomationRuleAction(slug, {
                        id: row.id,
                      });
                      if (!result.ok) {
                        toast.error(result.error.message);
                        return;
                      }
                      toast.success("Rule deleted");
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {ordered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground py-10 text-center"
              >
                No automation rules yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit rule" : "New rule"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <Field label="Name" htmlFor="rule-name">
              <Input
                id="rule-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Trigger" htmlFor="rule-trigger">
                <Select
                  value={draft.trigger}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      trigger: value as "ticket.created" | "message.created",
                    }))
                  }
                >
                  <SelectTrigger id="rule-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket.created">ticket.created</SelectItem>
                    <SelectItem value="message.created">
                      message.created
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Match mode" htmlFor="rule-mode">
                <Select
                  value={draft.mode}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      mode: value as "all" | "any",
                    }))
                  }
                >
                  <SelectTrigger id="rule-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All conditions</SelectItem>
                    <SelectItem value="any">Any condition</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Conditions</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      conditions: [...prev.conditions, emptyCondition()],
                    }))
                  }
                >
                  Add condition
                </Button>
              </div>
              {draft.conditions.map((condition, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-4">
                  <Input
                    value={condition.field}
                    placeholder="field"
                    onChange={(event) =>
                      setDraft((prev) => {
                        const conditions = [...prev.conditions];
                        conditions[index] = {
                          ...condition,
                          field: event.target.value,
                        };
                        return { ...prev, conditions };
                      })
                    }
                  />
                  <Select
                    value={condition.op}
                    onValueChange={(value) =>
                      setDraft((prev) => {
                        const conditions = [...prev.conditions];
                        conditions[index] = {
                          ...condition,
                          op: value as AutomationCondition["op"],
                        };
                        return { ...prev, conditions };
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">equals</SelectItem>
                      <SelectItem value="contains">contains</SelectItem>
                      <SelectItem value="startsWith">startsWith</SelectItem>
                      <SelectItem value="endsWith">endsWith</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={String(condition.value ?? "")}
                    placeholder="value"
                    onChange={(event) =>
                      setDraft((prev) => {
                        const conditions = [...prev.conditions];
                        conditions[index] = {
                          ...condition,
                          value: event.target.value,
                        };
                        return { ...prev, conditions };
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        conditions: prev.conditions.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Actions</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      actions: [
                        ...prev.actions,
                        { type: "add_tag", tagName: "refund" },
                      ],
                    }))
                  }
                >
                  Add action
                </Button>
              </div>
              {draft.actions.map((action, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-3">
                  <Select
                    value={action.type}
                    onValueChange={(value) =>
                      setDraft((prev) => {
                        const actions = [...prev.actions];
                        if (value === "set_priority") {
                          actions[index] = { type: "set_priority", value: "HIGH" };
                        } else if (value === "set_status") {
                          actions[index] = { type: "set_status", value: "OPEN" };
                        } else if (value === "add_tag") {
                          actions[index] = { type: "add_tag", tagName: "refund" };
                        } else {
                          actions[index] = {
                            type: "assign",
                            strategy: "round_robin",
                          };
                        }
                        return { ...prev, actions };
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="set_priority">set_priority</SelectItem>
                      <SelectItem value="set_status">set_status</SelectItem>
                      <SelectItem value="add_tag">add_tag</SelectItem>
                      <SelectItem value="assign">assign</SelectItem>
                    </SelectContent>
                  </Select>
                  {action.type === "set_priority" || action.type === "set_status" ? (
                    <Input
                      value={action.value}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const actions = [...prev.actions];
                          actions[index] = {
                            ...action,
                            value: event.target.value as never,
                          };
                          return { ...prev, actions };
                        })
                      }
                    />
                  ) : action.type === "add_tag" ? (
                    <Input
                      value={action.tagName}
                      onChange={(event) =>
                        setDraft((prev) => {
                          const actions = [...prev.actions];
                          actions[index] = {
                            type: "add_tag",
                            tagName: event.target.value,
                          };
                          return { ...prev, actions };
                        })
                      }
                    />
                  ) : (
                    <Input value="round_robin" disabled />
                  )}
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        actions: prev.actions.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </section>

            <section className="space-y-2 rounded-lg border p-3">
              <h3 className="text-sm font-medium">Test against ticket</h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Ticket number"
                  value={testNumber}
                  onChange={(event) => setTestNumber(event.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={pending || !testNumber}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await testAutomationRuleAction(slug, {
                        ticketNumber: Number(testNumber),
                        conditions: {
                          mode: draft.mode,
                          conditions: draft.conditions,
                        },
                      });
                      if (!result.ok) {
                        toast.error(result.error.message);
                        return;
                      }
                      setTestResult(
                        result.data.matches ? "Matched" : "Did not match",
                      );
                    });
                  }}
                >
                  Dry run
                </Button>
              </div>
              {testResult ? (
                <p className="text-muted-foreground text-xs">{testResult}</p>
              ) : null}
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !draft.name.trim() || draft.actions.length === 0}
              onClick={save}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
