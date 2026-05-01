import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type z from "zod";

type ValidationIssue = {
  path: (string | number | symbol)[];
  message: string;
  code: string;
};

export class ValidationError extends Error {
  constructor(
    public readonly issues: ValidationIssue[],
    cause?: Error,
  ) {
    super("Validation error", {
      cause: cause ?? new Error("Unknown validation error"),
    });
    this.name = "ValidationError";
  }
}

export const zValidator = <
  T extends z.ZodType,
  Target extends keyof ValidationTargets,
>(
  target: Target,
  schema: T,
) =>
  zv(target, schema, (result) => {
    if (!result.success) {
      const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
      }));
      throw new ValidationError(issues, result.error);
    }
  });

export const formatValidationErrors = (
  issues: ValidationError["issues"],
): Record<string, string> => {
  return issues.reduce(
    (acc, curr) => {
      acc[curr.path.join(".")] = curr.message;
      return acc;
    },
    {} as Record<string, string>,
  );
};
