import { describe, expect, it } from "vitest";
import {
  evaluateAutomation,
  type AutomationTicketContext,
} from "@/lib/automation-evaluator";

const baseTicket: AutomationTicketContext = {
  subject: "Need a refund for order 42",
  status: "OPEN",
  priority: "NORMAL",
  channel: "EMAIL",
  customerEmail: "casey@example.com",
  customerName: "Casey",
  tags: ["billing"],
  assigneeMembershipId: null,
};

describe("evaluateAutomation", () => {
  const cases: Array<{
    name: string;
    mode: "all" | "any";
    conditions: Array<{
      field: string;
      op: "equals" | "contains" | "startsWith" | "endsWith" | "in";
      value: string | string[];
    }>;
    expected: boolean;
  }> = [
    {
      name: "subject contains refund",
      mode: "all",
      conditions: [{ field: "subject", op: "contains", value: "refund" }],
      expected: true,
    },
    {
      name: "subject equals exact miss",
      mode: "all",
      conditions: [{ field: "subject", op: "equals", value: "refund" }],
      expected: false,
    },
    {
      name: "priority in list",
      mode: "all",
      conditions: [{ field: "priority", op: "in", value: ["LOW", "NORMAL"] }],
      expected: true,
    },
    {
      name: "customer email ends with example.com",
      mode: "all",
      conditions: [
        { field: "customer.email", op: "endsWith", value: "example.com" },
      ],
      expected: true,
    },
    {
      name: "tags contains billing",
      mode: "all",
      conditions: [{ field: "tags", op: "contains", value: "billing" }],
      expected: true,
    },
    {
      name: "any mode matches one condition",
      mode: "any",
      conditions: [
        { field: "priority", op: "equals", value: "URGENT" },
        { field: "channel", op: "equals", value: "EMAIL" },
      ],
      expected: true,
    },
    {
      name: "all mode requires every condition",
      mode: "all",
      conditions: [
        { field: "subject", op: "startsWith", value: "need" },
        { field: "status", op: "equals", value: "CLOSED" },
      ],
      expected: false,
    },
  ];

  for (const row of cases) {
    it(row.name, () => {
      expect(
        evaluateAutomation(
          { mode: row.mode, conditions: row.conditions },
          baseTicket,
        ),
      ).toBe(row.expected);
    });
  }

  it("matches empty conditions", () => {
    expect(evaluateAutomation({ mode: "all", conditions: [] }, baseTicket)).toBe(
      true,
    );
  });
});
