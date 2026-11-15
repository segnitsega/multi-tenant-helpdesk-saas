import { NextResponse } from "next/server";
import { systemDb } from "@/server/db/system";
import { redis } from "@/server/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await systemDb.orm.public.Workspace.where({ slug: "__health__" }).first();
    if (redis.status === "wait") await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") {
      return NextResponse.json({ ready: false }, { status: 503 });
    }
    return NextResponse.json({ ready: true });
  } catch {
    return NextResponse.json({ ready: false }, { status: 503 });
  }
}
