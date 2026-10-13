import "server-only";
import { withTenantDb } from "@/server/db";
import { NotFoundError } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";

export async function findOrCreateByEmail(
  ctx: Pick<TenantContext, "workspaceId">,
  input: { email: string; name?: string | null },
) {
  const email = input.email.trim().toLowerCase();

  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.Customer.where({
      workspaceId: ctx.workspaceId,
      email,
    }).first();
    if (existing) {
      if (input.name && !existing.name) {
        return tx.orm.public.Customer.where({ id: existing.id }).update({
          name: input.name.trim(),
        });
      }
      return existing;
    }

    return tx.orm.public.Customer.create({
      workspaceId: ctx.workspaceId,
      email,
      name: input.name?.trim() || null,
    });
  });
}

export async function listCustomers(
  ctx: Pick<TenantContext, "workspaceId">,
  opts: { q?: string; limit?: number } = {},
) {
  const limit = opts.limit ?? 50;
  return withTenantDb(ctx, async (tx) => {
    const rows = await tx.orm.public.Customer.where({
      workspaceId: ctx.workspaceId,
    })
      .limit(200)
      .all();

    const q = opts.q?.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (row) =>
            row.email.toLowerCase().includes(q) ||
            (row.name?.toLowerCase().includes(q) ?? false),
        )
      : rows;

    return filtered
      .sort((a, b) => a.email.localeCompare(b.email))
      .slice(0, limit);
  });
}

export async function getCustomer(
  ctx: Pick<TenantContext, "workspaceId">,
  customerId: string,
) {
  return withTenantDb(ctx, async (tx) => {
    const customer = await tx.orm.public.Customer.where({
      id: customerId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  });
}

export async function updateCustomer(
  ctx: Pick<TenantContext, "workspaceId">,
  customerId: string,
  input: {
    name?: string | null;
    phone?: string | null;
  },
) {
  return withTenantDb(ctx, async (tx) => {
    const existing = await tx.orm.public.Customer.where({
      id: customerId,
      workspaceId: ctx.workspaceId,
    }).first();
    if (!existing) throw new NotFoundError("Customer not found");

    const patch: {
      name?: string | null;
      phone?: string | null;
    } = {};
    if ("name" in input) patch.name = input.name?.trim() || null;
    if ("phone" in input) patch.phone = input.phone?.trim() || null;

    return tx.orm.public.Customer.where({ id: customerId }).update(patch);
  });
}
