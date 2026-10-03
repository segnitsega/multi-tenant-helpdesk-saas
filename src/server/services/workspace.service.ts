import "server-only";
import { randomBytes } from "node:crypto";
import { systemDb } from "@/server/db/system";
import { env } from "@/server/env";
import { ConflictError } from "@/lib/api-error";
import type { CreateWorkspaceInput } from "@/lib/validators/workspace";

const DEFAULT_SLA = [
  { priority: "LOW" as const, firstResponseMinutes: 480, resolutionMinutes: 2880 },
  { priority: "NORMAL" as const, firstResponseMinutes: 60, resolutionMinutes: 480 },
  { priority: "HIGH" as const, firstResponseMinutes: 30, resolutionMinutes: 240 },
  { priority: "URGENT" as const, firstResponseMinutes: 15, resolutionMinutes: 120 },
];

const DEFAULT_TAGS = [
  { name: "billing", color: "#3366ff" },
  { name: "bug", color: "#e11d48" },
  { name: "feature", color: "#16a34a" },
];

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await systemDb.orm.public.Workspace.where({ slug }).first();
  return !existing;
}

export async function getWorkspaceById(workspaceId: string) {
  return systemDb.orm.public.Workspace.where({ id: workspaceId }).first();
}

export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
) {
  const slug = input.slug.trim().toLowerCase();
  const available = await isSlugAvailable(slug);
  if (!available) {
    throw new ConflictError("That workspace URL is already taken.");
  }

  return systemDb.transaction(async (tx) => {
    const workspace = await tx.orm.public.Workspace.create({
      name: input.name.trim(),
      slug,
      inboundAddress: `${slug}@${env.MAIL_DOMAIN}`,
      widgetKey: `wk_${randomBytes(12).toString("hex")}`,
    });

    const membership = await tx.orm.public.Membership.create({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
      readonly: false,
    });

    await tx.orm.public.WorkspaceCounter.create({
      workspaceId: workspace.id,
      ticketSeq: 0,
    });

    for (const policy of DEFAULT_SLA) {
      await tx.orm.public.SlaPolicy.create({
        workspaceId: workspace.id,
        priority: policy.priority,
        firstResponseMinutes: policy.firstResponseMinutes,
        resolutionMinutes: policy.resolutionMinutes,
        enabled: true,
      });
    }

    for (const tag of DEFAULT_TAGS) {
      await tx.orm.public.Tag.create({
        workspaceId: workspace.id,
        name: tag.name,
        color: tag.color,
      });
    }

    await tx.orm.public.CannedReply.create({
      workspaceId: workspace.id,
      title: "Thanks for reaching out",
      shortcut: "thanks",
      bodyHtml:
        "<p>Hi there,</p><p>Thanks for contacting us — we’re on it and will follow up shortly.</p><p>Best,<br/>Support</p>",
    });

    return { workspace, membership };
  });
}
