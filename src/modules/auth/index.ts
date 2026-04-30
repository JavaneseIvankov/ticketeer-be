import { Hono } from "hono";

// Purpose: `src/modules/auth/index.ts` is the collapsed entrypoint for the auth
// domain. It can temporarily hold auth schemas, queries, logic, and direct route
// registration until the module is split into focused files.
export const authRoutes = new Hono();

authRoutes.get("/auth/me", (c) =>
  c.json({
    status: "success",
    message: "Auth module placeholder",
    data: null
  })
);
