import "server-only";
import * as Sentry from "@sentry/node";
import { env } from "@/server/env";

let initialized = false;

export function initSentry(service: "web" | "worker") {
  if (initialized || !env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1,
    initialScope: {
      tags: { service },
    },
  });
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!env.SENTRY_DSN) {
    console.error(error);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
