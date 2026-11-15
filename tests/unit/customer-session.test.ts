import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("@/server/env", () => ({
  env: {
    AUTH_SECRET: "test-secret-test-secret-test-secret-12",
    NODE_ENV: "test",
  },
}));

import { verifyCustomerSessionToken } from "@/server/auth/customer-session";

function mint(payload: Record<string, unknown>) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", "test-secret-test-secret-test-secret-12")
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

describe("customer session tokens", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("verifies a valid portal token", () => {
    const token = mint({
      customerId: "11111111-1111-1111-1111-111111111111",
      workspaceId: "22222222-2222-2222-2222-222222222222",
      kind: "portal",
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const payload = verifyCustomerSessionToken(token);
    expect(payload?.kind).toBe("portal");
    expect(payload?.customerId).toContain("1111");
  });

  it("rejects expired and tampered tokens", () => {
    const expired = mint({
      customerId: "11111111-1111-1111-1111-111111111111",
      workspaceId: "22222222-2222-2222-2222-222222222222",
      kind: "widget",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(verifyCustomerSessionToken(expired)).toBeNull();
    expect(verifyCustomerSessionToken("not.a.token")).toBeNull();
  });
});
