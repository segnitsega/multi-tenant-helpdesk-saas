import { ZodError } from "zod";

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  readonly code = "NOT_FOUND" as const;

  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly code = "CONFLICT" as const;

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class BadRequestError extends Error {
  readonly code = "BAD_REQUEST" as const;

  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class PlanLimitError extends Error {
  readonly code = "PLAN_LIMIT" as const;
  readonly limit: string;
  readonly plan: string;

  constructor(message: string, opts: { limit: string; plan: string }) {
    super(message);
    this.name = "PlanLimitError";
    this.limit = opts.limit;
    this.plan = opts.plan;
  }
}

export type ApiErrorShape = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  limit?: string;
  plan?: string;
};

export function toFieldErrors(
  error: ZodError,
): Record<string, string[]> {
  const flat = error.flatten().fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value && value.length > 0) out[key] = value;
  }
  return out;
}

export function toApiError(error: unknown): ApiErrorShape {
  if (error instanceof PlanLimitError) {
    return {
      code: error.code,
      message: error.message,
      limit: error.limit,
      plan: error.plan,
    };
  }
  if (
    error instanceof ForbiddenError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof BadRequestError
  ) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof ZodError) {
    return {
      code: "VALIDATION",
      message: "Check the form and try again.",
      fieldErrors: toFieldErrors(error),
    };
  }
  if (error instanceof Error) {
    return { code: "INTERNAL", message: error.message };
  }
  return { code: "INTERNAL", message: "Something went wrong." };
}
