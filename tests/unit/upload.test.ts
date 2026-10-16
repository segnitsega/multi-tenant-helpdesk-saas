import { describe, expect, it } from "vitest";
import {
  isAllowedUploadMimeType,
  isAllowedUploadSize,
  MAX_UPLOAD_BYTES,
} from "@/config/uploads";
import { presignUploadSchema } from "@/lib/validators/upload";

describe("upload allow-list", () => {
  it("accepts known mime types", () => {
    expect(isAllowedUploadMimeType("image/png")).toBe(true);
    expect(isAllowedUploadMimeType("application/pdf")).toBe(true);
  });

  it("rejects unknown mime types", () => {
    expect(isAllowedUploadMimeType("application/x-msdownload")).toBe(false);
    expect(isAllowedUploadMimeType("text/html")).toBe(false);
  });

  it("enforces the size limit", () => {
    expect(isAllowedUploadSize(1)).toBe(true);
    expect(isAllowedUploadSize(MAX_UPLOAD_BYTES)).toBe(true);
    expect(isAllowedUploadSize(MAX_UPLOAD_BYTES + 1)).toBe(false);
    expect(isAllowedUploadSize(0)).toBe(false);
  });
});

describe("presignUploadSchema", () => {
  it("parses a valid payload", () => {
    const parsed = presignUploadSchema.safeParse({
      ticketNumber: 12,
      filename: "receipt.png",
      contentType: "image/png",
      sizeBytes: 2048,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects oversized or bad types", () => {
    expect(
      presignUploadSchema.safeParse({
        ticketNumber: 12,
        filename: "virus.exe",
        contentType: "application/x-msdownload",
        sizeBytes: 100,
      }).success,
    ).toBe(false);

    expect(
      presignUploadSchema.safeParse({
        ticketNumber: 12,
        filename: "big.png",
        contentType: "image/png",
        sizeBytes: MAX_UPLOAD_BYTES + 1,
      }).success,
    ).toBe(false);
  });
});
