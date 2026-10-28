import "server-only";
import Stripe from "stripe";
import { env } from "@/server/env";
import { BadRequestError } from "@/lib/api-error";
import type { PaidPlanId } from "@/config/plans";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new BadRequestError("Stripe is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-09-30.endive",
      typescript: true,
    });
  }
  return stripeClient;
}

export function priceIdForPlan(plan: PaidPlanId): string {
  const priceId =
    plan === "PRO" ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_BUSINESS;
  if (!priceId) {
    throw new BadRequestError(`Stripe price for ${plan} is not configured`);
  }
  return priceId;
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  if (env.STRIPE_PRICE_PRO && priceId === env.STRIPE_PRICE_PRO) return "PRO";
  if (env.STRIPE_PRICE_BUSINESS && priceId === env.STRIPE_PRICE_BUSINESS) {
    return "BUSINESS";
  }
  return null;
}

export function constructStripeEvent(payload: string, signature: string) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new BadRequestError("Stripe webhook secret is not configured");
  }
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}
