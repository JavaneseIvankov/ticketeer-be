import { z } from "zod";

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

export const meResponseDataSchema = z.object({
  userId: z.string().nullable(),
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]).nullable(),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type MeResponseData = z.infer<typeof meResponseDataSchema>;
