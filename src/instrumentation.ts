export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentry } = await import("@/server/observability/sentry");
    initSentry("web");
  }
}
