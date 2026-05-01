import { DrizzleQueryError, sql } from "drizzle-orm";
import { DatabaseError } from "pg";
import type { Logger } from "pino";
import { tryCatch, withSpan } from "@/shared/utils";
import type { DbOrTx } from "./client";

type ErrorMeta = {
  constraint?: string;
  column?: string;
};

export class BaseDatabaseError extends Error {
  meta?: ErrorMeta;

  constructor(message: string, meta?: ErrorMeta, cause?: unknown) {
    super(message, { cause });
    this.meta = meta;
  }
}

export class DuplicateEntryError extends BaseDatabaseError {
  constructor(meta?: ErrorMeta, cause?: unknown) {
    super(
      `Duplicate entry${meta?.constraint ? ` (${meta.constraint})` : ""}`,
      meta,
      cause,
    );
    this.name = "DuplicateEntryError";
  }
}

export class ForeignKeyViolationError extends BaseDatabaseError {
  constructor(meta?: ErrorMeta, cause?: unknown) {
    super(
      `Invalid reference${meta?.constraint ? ` (${meta.constraint})` : ""}`,
      meta,
      cause,
    );
    this.name = "ForeignKeyViolationError";
  }
}

export class NotNullViolationError extends BaseDatabaseError {
  constructor(meta?: ErrorMeta, cause?: unknown) {
    super(`Missing required field: ${meta?.column ?? "unknown"}`, meta, cause);
    this.name = "NotNullViolationError";
  }
}

export class GenericDatabaseError extends BaseDatabaseError {
  constructor(message: string, cause?: unknown) {
    super(`Database error: ${message}`, undefined, cause);
    this.name = "GenericDatabaseError";
  }
}

export class UnexpectedError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`Unexpected error: ${message}`, { cause });
    this.name = "UnexpectedError";
  }
}

export class NotFoundError extends BaseDatabaseError {
  constructor(message: string, cause?: unknown) {
    super(`Not found: ${message}`, undefined, cause);
    this.name = "NotFoundError";
  }
}

function toDomainError(error: unknown): Error {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    const pgError = error.cause;

    switch (pgError.code) {
      case "23505":
        return new DuplicateEntryError(
          { constraint: pgError.constraint },
          error,
        );

      case "23503":
        return new ForeignKeyViolationError(
          { constraint: pgError.constraint },
          error,
        );

      case "23502":
        return new NotNullViolationError({ column: pgError.column }, error);

      default:
        return new GenericDatabaseError(pgError.message, error);
    }
  }

  if (error instanceof BaseDatabaseError) {
    return error;
  }

  return new UnexpectedError("Unknown failure", error);
}

export function rethrowDbError(error: unknown): never {
  throw toDomainError(error);
}

export function mapDbError(error: unknown): Error {
  return toDomainError(error);
}

export function isConstraint(error: unknown, constraint: string): boolean {
  return (
    error instanceof BaseDatabaseError && error.meta?.constraint === constraint
  );
}

export const dbOperation =
  (deps: { logger: Logger }) =>
  <T>(
    options: { label?: string; args?: Record<string, unknown> },
    fn: () => Promise<T>,
  ) => {
    const spanWithLog = withSpan({ logger: deps.logger });
    return tryCatch<T, never>({
      fn: () => {
        return spanWithLog<T>(fn, options?.label ?? "unlabeled");
      },
      onError: (e) => {
        throw e; // rethrow error
      },
    });
  };

export const isDbConnected = async (
  db: DbOrTx,
  { logger }: { logger: Logger },
) => {
  try {
    await db.execute(sql`select 1=1`).execute();
    return true;
  } catch (e) {
    logger.error({ error: e }, "db connection error");
    return false;
  }
};
