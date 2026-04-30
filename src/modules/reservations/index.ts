import { Hono } from "hono";

// Purpose: `src/modules/reservations/index.ts` is the collapsed entrypoint for
// hold creation, confirm/cancel flows, expiry handling, and concurrency-safe
// reservation transaction logic.
export const reservationRoutes = new Hono();

reservationRoutes.get("/reservations/:reservationId", (c) =>
  c.json({
    status: "success",
    message: "Reservations module placeholder",
    data: { reservationId: c.req.param("reservationId") }
  })
);
