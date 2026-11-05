import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/server/env";

export type CustomerSessionKind = "portal" | "widget";

export type CustomerSessionPayload = {
  customerId: string;
  workspaceId: string;
  kind: CustomerSessionKind;
  exp: number;
};

const PORTAL_COOKIE = "relay_portal_session";
const WIDGET_COOKIE = "relay_widget_session";

function cookieName(kind: CustomerSessionKind) {
  return kind === "portal" ? PORTAL_COOKIE : WIDGET_COOKIE;
}

function sign(payload: Omit<CustomerSessionPayload, "exp">, ttlSeconds: number) {
  const body: CustomerSessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", env.AUTH_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

function verify(token: string): CustomerSessionPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = createHmac("sha256", env.AUTH_SECRET)
    .update(encoded)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as CustomerSessionPayload;
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    if (!payload.customerId || !payload.workspaceId) return null;
    if (payload.kind !== "portal" && payload.kind !== "widget") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setCustomerSession(
  payload: Omit<CustomerSessionPayload, "exp">,
  opts?: { ttlSeconds?: number },
) {
  const ttlSeconds = opts?.ttlSeconds ?? (payload.kind === "widget" ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 14);
  const value = sign(payload, ttlSeconds);
  const jar = await cookies();
  jar.set(cookieName(payload.kind), value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: payload.kind === "widget" ? "none" : "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export async function clearCustomerSession(kind: CustomerSessionKind) {
  const jar = await cookies();
  jar.delete(cookieName(kind));
}

export async function getCustomerSession(
  kind: CustomerSessionKind,
): Promise<CustomerSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieName(kind))?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload || payload.kind !== kind) return null;
  return payload;
}

export function verifyCustomerSessionToken(token: string) {
  return verify(token);
}
