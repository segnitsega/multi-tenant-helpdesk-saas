import { describe, expect, it } from "vitest";
import { computeSlaDueDates, remainingMs, slaState } from "@/lib/sla";
import { renderCannedBody } from "@/lib/canned-reply";

describe("SLA helpers", () => {
  it("computes due dates from policy minutes", () => {
    const createdAt = new Date("2026-10-10T10:00:00.000Z");
    const dues = computeSlaDueDates(createdAt, {
      firstResponseMinutes: 60,
      resolutionMinutes: 480,
    });

    expect(dues.slaFirstResponseDueAt?.toISOString()).toBe(
      "2026-10-10T11:00:00.000Z",
    );
    expect(dues.slaResolutionDueAt?.toISOString()).toBe(
      "2026-10-10T18:00:00.000Z",
    );
  });

  it("returns null dues without a policy", () => {
    expect(computeSlaDueDates(new Date(), null)).toEqual({
      slaFirstResponseDueAt: null,
      slaResolutionDueAt: null,
    });
  });

  it("computes remaining ms", () => {
    const due = new Date(Date.now() + 60_000);
    const remaining = remainingMs(due);
    expect(remaining).toBeGreaterThan(50_000);
    expect(remainingMs(null)).toBeNull();
  });

  it("maps sla state from remaining ratio", () => {
    const start = new Date("2026-07-11T10:00:00.000Z");
    const due = new Date("2026-07-11T12:00:00.000Z");
    const total = due.getTime() - start.getTime();

    expect(slaState(due, new Date("2026-07-11T10:30:00.000Z"), total)).toBe(
      "ok",
    );
    expect(slaState(due, new Date("2026-07-11T11:30:00.000Z"), total)).toBe(
      "warning",
    );
    expect(slaState(due, new Date("2026-07-11T12:01:00.000Z"), total)).toBe(
      "breached",
    );
  });
});

describe("canned reply variables", () => {
  it("replaces known placeholders", () => {
    const html = renderCannedBody(
      "<p>Hi {{customer.name}}, ticket {{ticket.number}} — {{agent.name}}</p>",
      {
        customerName: "Ana",
        agentName: "Sam",
        ticketNumber: 42,
      },
    );
    expect(html).toBe("<p>Hi Ana, ticket 42 — Sam</p>");
  });
});
