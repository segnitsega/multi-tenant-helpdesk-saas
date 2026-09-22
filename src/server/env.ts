import "server-only";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_SYSTEM: z.string().url(),
  MIGRATE_DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  MAIL_DOMAIN: z.string(),
  MAIL_FROM_NAME: z.string().default("Relay"),
  SMTP_URL: z.string().optional(), // dev (Mailpit)
  POSTMARK_SERVER_TOKEN: z.string().optional(), // prod
  POSTMARK_INBOUND_USER: z.string().optional(),
  POSTMARK_INBOUND_PASS: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
});

export const env = schema.parse(process.env);
