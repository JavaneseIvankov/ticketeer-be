import { z } from "zod";

// Purpose: `src/shared/http.ts` contains success and error response envelope
// helpers plus transport-level request and response utilities.
export const uuidSchema = z.uuid();
export const slugSchema = z.string().min(1).max(20);
export const isoDatetimeStringSchema = z.string().datetime();
export const nullableIsoDatetimeStringSchema =
  isoDatetimeStringSchema.nullable();
export const emptyDetailSchema = z.record(z.string(), z.unknown());

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

// TODO: integrate canonical error codes
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
      code: errorCode ?? ("INTERNAL_SERVER_ERROR" as T),
      detail: error?.detail ?? {},
    },
  };
}
