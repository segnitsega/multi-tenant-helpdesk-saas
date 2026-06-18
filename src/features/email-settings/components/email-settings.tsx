"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { replayInboundEmailAction } from "@/features/email-settings/actions";

export type InboundEmailRow = {
  id: string;
  providerMessageId: string;
  status: string;
  error: string | null;
  createdAt: string;
  subject: string | null;
};

export function EmailSettingsPanel({
  slug,
  inboundAddress,
  recent,
  testDetected,
}: {
  slug: string;
  inboundAddress: string;
  recent: InboundEmailRow[];
  testDetected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    await navigator.clipboard.writeText(inboundAddress);
    setCopied(true);
    toast.success("Inbound address copied");
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Inbound address</h2>
          <p className="text-muted-foreground text-sm">
            Forward your support inbox to this address.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="bg-muted rounded-md px-3 py-2 text-sm">
            {inboundAddress}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={copyAddress}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            Copy
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Forwarding setup</h2>
          <p className="text-muted-foreground text-sm">
            Point Gmail or Outlook at your Relay inbound address.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-border space-y-2 rounded-lg border p-4 text-sm">
            <h3 className="font-medium">Gmail</h3>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
              <li>Settings → See all settings → Forwarding and POP/IMAP</li>
              <li>Add a forwarding address and paste the inbound address</li>
              <li>Confirm the verification email when it arrives</li>
            </ol>
          </div>
          <div className="border-border space-y-2 rounded-lg border p-4 text-sm">
            <h3 className="font-medium">Outlook</h3>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-4">
              <li>Settings → Mail → Forwarding</li>
              <li>Enable forwarding to the inbound address</li>
              <li>Keep a copy in Outlook if you want a local archive</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Send a test email</h2>
            <p className="text-muted-foreground text-sm">
              Mail anything to the inbound address. This check turns green when
              Relay receives it.
            </p>
          </div>
          <div
            className={
              testDetected
                ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                : "bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-medium"
            }
          >
            {testDetected ? "Email received" : "Waiting for email"}
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => router.refresh()}>
          Refresh check
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Recent inbound</h2>
          <p className="text-muted-foreground text-sm">
            Failures can be replayed for workspace `{slug}`.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-sm">
                  {row.subject ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{row.status}</TableCell>
                <TableCell className="text-muted-foreground max-w-[240px] truncate text-xs">
                  {row.error ?? "—"}
                </TableCell>
                <TableCell>
                  {row.status === "FAILED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await replayInboundEmailAction(slug, {
                            id: row.id,
                          });
                          if (!result.ok) {
                            toast.error(result.error.message);
                            return;
                          }
                          toast.success("Replay queued");
                          router.refresh();
                        });
                      }}
                    >
                      Replay
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {recent.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-10 text-center"
                >
                  No inbound email yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
