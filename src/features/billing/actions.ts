"use server";

import { tenantAction } from "@/server/tenancy/action";
import {
  createCheckoutSession,
  createPortalSession,
} from "@/server/services/billing.service";
import {
  createCheckoutSessionSchema,
  emptyBillingSchema,
} from "@/lib/validators/billing";

export const createCheckoutSessionAction = tenantAction(
  "billing.manage",
  createCheckoutSessionSchema,
  async (ctx, input) => createCheckoutSession(ctx, input.plan),
);

export const createPortalSessionAction = tenantAction(
  "billing.manage",
  emptyBillingSchema,
  async (ctx) => createPortalSession(ctx),
);
