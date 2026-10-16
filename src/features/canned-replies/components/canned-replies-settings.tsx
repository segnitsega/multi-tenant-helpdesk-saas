"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  createCannedReplyAction,
  deleteCannedReplyAction,
  updateCannedReplyAction,
} from "@/features/canned-replies/actions";

export type CannedReplyRow = {
  id: string;
  title: string;
  shortcut: string | null;
  bodyHtml: string;
};

const emptyForm = {
  title: "",
  shortcut: "",
  bodyHtml: "<p></p>",
};

export function CannedRepliesSettings({
  slug,
  replies,
}: {
  slug: string;
  replies: CannedReplyRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: CannedReplyRow) {
    setEditingId(row.id);
    setForm({
      title: row.title,
      shortcut: row.shortcut ?? "",
      bodyHtml: row.bodyHtml,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const payload = {
        title: form.title,
        shortcut: form.shortcut.trim() || null,
        bodyHtml: form.bodyHtml,
      };
      const result = editingId
        ? await updateCannedReplyAction(slug, { id: editingId, ...payload })
        : await createCannedReplyAction(slug, payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setOpen(false);
      toast.success(editingId ? "Canned reply updated" : "Canned reply created");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteCannedReplyAction(slug, { id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Canned reply deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Use variables like {"{{customer.name}}"}, {"{{agent.name}}"}, and{" "}
          {"{{ticket.number}}"}.
        </p>
        <Button disabled={pending} onClick={openCreate}>
          New reply
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Shortcut</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {replies.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.title}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.shortcut ? `/${row.shortcut}` : "—"}
              </TableCell>
              <TableCell className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => openEdit(row)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(row.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {replies.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-muted-foreground py-10 text-center"
              >
                No canned replies yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit canned reply" : "New canned reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Title" htmlFor="canned-title">
              <Input
                id="canned-title"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Shortcut" htmlFor="canned-shortcut">
              <Input
                id="canned-shortcut"
                value={form.shortcut}
                placeholder="thanks"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    shortcut: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Body HTML" htmlFor="canned-body">
              <Textarea
                id="canned-body"
                rows={8}
                value={form.bodyHtml}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bodyHtml: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || !form.title.trim()} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
