import { z } from "zod";

// Purpose: `src/shared/http.ts` contains success and error response envelope
// helpers plus transport-level request and response utilities.
export const uuidSchema = z.uuid();
export const slugSchema = z.string().min(1).max(20);
const isoDateInputSchema = z.union([z.iso.datetime(), z.date()]);
export const dateSchema = isoDateInputSchema.pipe(z.coerce.date());
export const nullableDateSchema = z.union([dateSchema, z.null()]);
export const dateValueSchema = z.date();
export const nullableDateValueSchema = dateValueSchema.nullable();
export const emptyDetailSchema = z.record(z.string(), z.unknown());
export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "SEAT_ALREADY_RESERVED",
  "EVENT_NOT_MUTABLE",
  "INVALID_RESERVATION_STATE_TRANSITION",
  "RESERVATION_EXPIRED",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
  "INVALID_CREDENTIALS",
  "EVENT_SLUG_EXISTS",
  "EMAIL_ALREADY_REGISTERED",
  "SERVICE_UNAVAILABLE",
]);

export const successEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.literal("success"),
    message: z.string(),
    data: dataSchema,
  });

export const errorEnvelopeSchema = <T extends z.ZodTypeAny>(codeSchema: T) =>
  z.object({
    status: z.literal("error"),
    message: z.string(),
    error: z.object({
      code: codeSchema,
      detail: emptyDetailSchema,
    }),
  });

export type SuccessResponse<T> = {
  status: "success";
  message: string;
  data: T;
};

export type ErrorResponse<TCode extends string> = {
  status: "error";
  message: string;
  error: {
    code: TCode;
    detail: Record<string, unknown>;
  };
};

export const ok = <T>(message: string, data: T): SuccessResponse<T> => ({
  status: "success",
  message,
  data,
});

export function err<T extends string>(
  message: string,
  errorCode: T,
  error: {
    code: T;
    detail: Record<string, unknown>;
  },
): ErrorResponse<T>;

export function err<T extends string>(
  message: string,
  errorCode?: T,
): ErrorResponse<T>;

export function err<T extends string>(
  message: string,
  errorCode?: T,
  error?: {
    code: T;
    detail: Record<string, unknown>;
  },
): ErrorResponse<T> {
  return {
    status: "error",
    message: message,
    error: {
      code: errorCode ?? ("INTERNAL_ERROR" as T),
      detail: error?.detail ?? {},
    },
  };
}
