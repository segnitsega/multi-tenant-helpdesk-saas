import "server-only";
import type { z } from "zod";
import type { Permission } from "@/config/permissions";
import { toApiError, toFieldErrors } from "@/lib/api-error";
import type { TenantContext } from "@/types/tenant";
import { getTenantContext } from "./context";
import { assertCan } from "./permissions";

export function tenantAction<S extends z.ZodTypeAny, R>(
  permission: Permission,
  schema: S,
  handler: (ctx: TenantContext, input: z.infer<S>) => Promise<R>,
) {
  return async (slug: string, rawInput: unknown) => {
    const ctx = await getTenantContext(slug);
    assertCan(ctx, permission);
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: {
          code: "VALIDATION",
          message: "Check the form and try again.",
          fieldErrors: toFieldErrors(parsed.error),
        },
      };
    }
    try {
      return { ok: true as const, data: await handler(ctx, parsed.data) };
    } catch (e) {
      return { ok: false as const, error: toApiError(e) };
    }
  };
}
