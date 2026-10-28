import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
});

export type CreateCheckoutSessionInput = z.infer<
  typeof createCheckoutSessionSchema
>;

export const emptyBillingSchema = z.object({});
