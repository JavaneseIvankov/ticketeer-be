import { factory } from "@/config/app";
import { ok } from "@/shared/http";
import { reservationParamsSchema } from "./schemas";

// Purpose: `src/modules/reservations/index.ts` is the collapsed entrypoint for
// hold creation, confirm/cancel flows, expiry handling, and concurrency-safe
// reservation transaction logic.
export const reservationRoutes = factory
  .createApp()
  .get("/reservations/:reservationId", (c) => {
    const params = reservationParamsSchema.parse(c.req.param());

    return c.json(
      ok("Fetched reservation placeholder", {
        reservationId: params.reservationId,
        eventId: "00000000-0000-0000-0000-000000000000",
        seatId: "00000000-0000-0000-0000-000000000000",
        paymentId: "00000000-0000-0000-0000-000000000000",
        paymentStatus: "PENDING" as const,
        expiredAt: new Date(0),
        status: "PENDING" as const,
      }),
    );
  })
  .post("/reservations/:reservationId/cancel", (c) => {
    const params = reservationParamsSchema.parse(c.req.param());

    return c.json(
      ok("Canceled reservation placeholder", {
        reservationId: params.reservationId,
        status: "CANCELED" as const,
      }),
    );
  })
  .post("/reservations/:reservationId/confirm", (c) => {
    const params = reservationParamsSchema.parse(c.req.param());

    return c.json(
      ok("Confirmed reservation placeholder", {
        reservationId: params.reservationId,
        status: "RESERVED" as const,
        paymentId: "00000000-0000-0000-0000-000000000000",
        paymentStatus: "PAID" as const,
      }),
    );
  });
