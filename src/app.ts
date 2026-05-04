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
  const api = factory
    .createApp()
    .route("/", authRoutes)
    .route("/", eventRoutes)
    .route("/", reservationRoutes)
    .route("/", paymentRoutes);

  return factory
    .createApp()
    .get("/health", async (c) => {
      const connected = await isDbConnected(db, { logger: rootLogger });
      if (!connected) {
        return c.json(err("service unavailable", "SERVICE_UNAVAILABLE"));
      }
      return c.json(ok("OK", { connected }));
    })
    .route("/api/v1", api);
};

export const app = createApp();
export type AppType = typeof app;
