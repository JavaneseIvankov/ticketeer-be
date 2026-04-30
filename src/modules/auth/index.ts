import { Hono } from "hono";
import { z } from "zod";

import { ok } from "@/shared/http";

// Purpose: `src/modules/auth/index.ts` is the collapsed entrypoint for the auth
// domain. It can temporarily hold auth schemas, queries, logic, and direct route
// registration until the module is split into focused files.
export const authRoutes = new Hono();

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  name: z.string().min(1),
  role: z.enum(["ORGANIZER", "USER"])
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

export const meResponseDataSchema = z.object({
  userId: z.string().nullable(),
  role: z.enum(["USER", "ORGANIZER", "ADMIN"]).nullable()
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type MeResponseData = z.infer<typeof meResponseDataSchema>;

authRoutes.get("/auth/me", (c) =>
  c.json(ok("Fetched current user placeholder", { userId: null, role: null }))
);

authRoutes.post("/auth/register", async (c) => {
  const body = registerBodySchema.parse(await c.req.json());

  return c.json(
    ok("Registered user placeholder", {
      email: body.email,
      name: body.name,
      role: body.role
    })
  );
});

authRoutes.post("/auth/login", async (c) => {
  const body = loginBodySchema.parse(await c.req.json());

  return c.json(
    ok("Logged in placeholder", {
      email: body.email
    })
  );
});
