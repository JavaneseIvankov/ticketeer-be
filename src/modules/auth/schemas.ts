import { z } from "zod";
import { successEnvelopeSchema, uuidSchema } from "@/shared/http";

export const userRoleSchema = z.enum(["USER", "ORGANIZER", "ADMIN"]);

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["ORGANIZER", "USER"]),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const registerResponseDataSchema = z.object({
  userId: uuidSchema,
  email: z.email(),
  name: z.string().min(1),
  role: userRoleSchema,
});

export const loginResponseDataSchema = z.object({
  token: z.string().min(1),
});

export const meResponseDataSchema = z.object({
  userId: uuidSchema,
  email: z.email(),
  name: z.string().min(1),
  role: userRoleSchema,
});

export const registerResponseSchema = successEnvelopeSchema(
  registerResponseDataSchema,
);
export const loginResponseSchema = successEnvelopeSchema(
  loginResponseDataSchema,
);
export const meResponseSchema = successEnvelopeSchema(meResponseDataSchema);

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterResponseData = z.infer<typeof registerResponseDataSchema>;
export type LoginResponseData = z.infer<typeof loginResponseDataSchema>;
export type MeResponseData = z.infer<typeof meResponseDataSchema>;
