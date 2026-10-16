import { describe, expect, it } from "vitest";
import { sanitizeAndPlainText, sanitizeRichHtml } from "@/lib/sanitize";

describe("sanitizeRichHtml", () => {
  it("strips script tags and event handlers", () => {
    const dirty =
      '<p onclick="alert(1)">Hello<script>alert(2)</script></p><img src=x onerror=alert(3)>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain("script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
    expect(clean).not.toContain("<img");
    expect(clean).toContain("Hello");
  });

  it("blocks javascript: urls", () => {
    const dirty = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps safe formatting tags and links", () => {
    const dirty =
      '<p><strong>Bold</strong> <em>italic</em> <a href="https://example.com">link</a></p>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).toContain("<strong>");
    expect(clean).toContain("<em>");
    expect(clean).toContain('href="https://example.com"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });
});

describe("sanitizeAndPlainText", () => {
  it("returns plain text alongside sanitized html", () => {
    const result = sanitizeAndPlainText("<p>Hello <strong>world</strong></p>");
    expect(result.bodyHtml).toContain("<strong>world</strong>");
    expect(result.bodyText).toContain("Hello");
    expect(result.bodyText).toContain("world");
  });
});
