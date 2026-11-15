import { NextResponse } from "next/server";
import { systemDb } from "@/server/db/system";
import { redis } from "@/server/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    database: "error",
    redis: "error",
  };

  try {
    await systemDb.orm.public.Workspace.where({ slug: "__health__" }).first();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    if (redis.status === "wait") await redis.connect();
    const pong = await redis.ping();
    checks.redis = pong === "PONG" ? "ok" : "error";
  } catch {
    checks.redis = "error";
  }

  const ok = checks.database === "ok" && checks.redis === "ok";
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", checks },
    { status: ok ? 200 : 503 },
  );
}
