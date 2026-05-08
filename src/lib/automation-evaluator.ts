export type AutomationOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "in";

export type AutomationCondition = {
  field: string;
  op: AutomationOperator;
  value: string | string[] | number | boolean | null;
};

export type AutomationConditions = {
  mode: "all" | "any";
  conditions: AutomationCondition[];
};

export type AutomationTicketContext = {
  subject: string;
  status: string;
  priority: string;
  channel: string;
  customerEmail: string;
  customerName: string | null;
  tags: string[];
  assigneeMembershipId: string | null;
};

export type AutomationAction =
  | { type: "set_priority"; value: string }
  | { type: "set_status"; value: string }
  | { type: "add_tag"; tagName: string }
  | { type: "assign"; strategy: "round_robin" };

function readField(
  ticket: AutomationTicketContext,
  field: string,
): string | string[] | null {
  switch (field) {
    case "subject":
      return ticket.subject;
    case "status":
      return ticket.status;
    case "priority":
      return ticket.priority;
    case "channel":
      return ticket.channel;
    case "customer.email":
      return ticket.customerEmail;
    case "customer.name":
      return ticket.customerName;
    case "tags":
      return ticket.tags;
    case "assigneeMembershipId":
      return ticket.assigneeMembershipId;
    default:
      return null;
  }
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function evaluateCondition(
  ticket: AutomationTicketContext,
  condition: AutomationCondition,
): boolean {
  const left = readField(ticket, condition.field);
  const right = condition.value;

  if (condition.op === "in") {
    const haystack = Array.isArray(right)
      ? right.map((item) => asString(item).toLowerCase())
      : asString(right)
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);

    if (Array.isArray(left)) {
      return left.some((item) => haystack.includes(item.toLowerCase()));
    }
    return haystack.includes(asString(left).toLowerCase());
  }

  const leftText = Array.isArray(left)
    ? left.join(" ").toLowerCase()
    : asString(left).toLowerCase();
  const rightText = asString(right).toLowerCase();

  switch (condition.op) {
    case "equals":
      return leftText === rightText;
    case "contains":
      return leftText.includes(rightText);
    case "startsWith":
      return leftText.startsWith(rightText);
    case "endsWith":
      return leftText.endsWith(rightText);
    default:
      return false;
  }
}

export function evaluateAutomation(
  conditions: AutomationConditions | null | undefined,
  ticket: AutomationTicketContext,
): boolean {
  if (!conditions || conditions.conditions.length === 0) return true;

  if (conditions.mode === "any") {
    return conditions.conditions.some((condition) =>
      evaluateCondition(ticket, condition),
    );
  }

  return conditions.conditions.every((condition) =>
    evaluateCondition(ticket, condition),
  );
}
