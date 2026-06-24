import { describe, expect, it } from "vitest";
import {
  channelForWorkspace,
  presenceKey,
  recentKeyForWorkspace,
  seqKeyForWorkspace,
} from "@/types/events";

describe("realtime event helpers", () => {
  it("builds workspace channel and buffer keys", () => {
    expect(channelForWorkspace("ws-1")).toBe("ws:ws-1");
    expect(recentKeyForWorkspace("ws-1")).toBe("ws:ws-1:recent");
    expect(seqKeyForWorkspace("ws-1")).toBe("ws:ws-1:seq");
  });

  it("builds presence keys", () => {
    expect(presenceKey("ticket-1", "member-1")).toBe(
      "presence:ticket-1:member-1",
    );
  });
});
