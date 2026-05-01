import { Hono } from "hono";

import { authRoutes } from "@/modules/auth";
import { eventRoutes } from "@/modules/events";
import { paymentRoutes } from "@/modules/payments";
import { reservationRoutes } from "@/modules/reservations";
import { err, ok } from "@/shared/http";
import { factory } from "./config/app";
import { db } from "./db/client";
import { isDbConnected } from "./db/utils";
import { rootLogger } from "./shared/logging";

// Purpose: `src/app.ts` creates the application instance, attaches shared
// middleware later, and mounts versioned module routers without starting the server.
export const createApp = () => {
  const app = factory.createApp();
  const api = factory.createApp();

  app.get("/health", async (c) => {
    const connected = await isDbConnected(db, { logger: rootLogger });
    if (!connected) {
      return c.json(err("service unavailable", "SERVICE_UNAVAILABLE"));
    }
    return c.json(ok("OK", { connected }));
  });

  api.route("/", authRoutes);
  api.route("/", eventRoutes);
  api.route("/", reservationRoutes);
  api.route("/", paymentRoutes);

  app.route("/api/v1", api);

  return app;
};
