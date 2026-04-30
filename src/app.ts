import { Hono } from "hono";

import { authRoutes } from "@/modules/auth";
import { eventRoutes } from "@/modules/events";
import { paymentRoutes } from "@/modules/payments";
import { reservationRoutes } from "@/modules/reservations";
import { ok } from "@/shared/http";

// Purpose: `src/app.ts` creates the application instance, attaches shared
// middleware later, and mounts versioned module routers without starting the server.
export const createApp = () => {
  const app = new Hono();
  const api = new Hono();

  api.get("/health", (c) => c.json(ok("OK", null)));

  api.route("/", authRoutes);
  api.route("/", eventRoutes);
  api.route("/", reservationRoutes);
  api.route("/", paymentRoutes);

  app.route("/api/v1", api);

  return app;
};
