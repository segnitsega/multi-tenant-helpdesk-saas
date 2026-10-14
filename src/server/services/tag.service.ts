import "server-only";
import { withTenantDb } from "@/server/db";
import { ConflictError, NotFoundError } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";

export async function listTags(ctx: Pick<TenantContext, "workspaceId">) {
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.Tag.where({
      workspaceId: ctx.workspaceId,
    }).all();
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createTag(
  ctx: Pick<TenantContext, "workspaceId">,
  input: { name: string; color: string },
) {
  const name = input.name.trim().toLowerCase();
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.Tag.where({
      workspaceId: ctx.workspaceId,
      name,
    }).first();
    if (existing) throw new ConflictError("A tag with that name already exists.");

    return tx.orm.public.Tag.create({
      workspaceId: ctx.workspaceId,
      name,
      color: input.color,
    });
  });
}

export async function updateTag(
  ctx: Pick<TenantContext, "workspaceId">,
  tagId: string,
  input: { name?: string; color?: string },
) {
  return withTenantDb(ctx, async (tx) => {
    const tag = await tx.orm.public.Tag.where({
      id: tagId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!tag) throw new NotFoundError("Tag not found");

    const patch: { name?: string; color?: string } = {};
    if (input.name) {
      const name = input.name.trim().toLowerCase();
      const clash = await tx.orm.public.Tag.where({
        workspaceId: ctx.workspaceId,
        name,
      }).first();
      if (clash && clash.id !== tagId) {
        throw new ConflictError("A tag with that name already exists.");
      }
      patch.name = name;
    }
    if (input.color) patch.color = input.color;

    return tx.orm.public.Tag.where({ id: tagId }).update(patch);
  });
}

export async function deleteTag(
  ctx: Pick<TenantContext, "workspaceId">,
  tagId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const tag = await tx.orm.public.Tag.where({
      id: tagId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!tag) throw new NotFoundError("Tag not found");
    await tx.orm.public.Tag.where({ id: tagId }).delete();
  });
}
