import { z } from "zod";
import { factory } from "@/config/app";
import { ok, uuidSchema } from "@/shared/http";

// Purpose: `src/modules/reservations/index.ts` is the collapsed entrypoint for
// hold creation, confirm/cancel flows, expiry handling, and concurrency-safe
// reservation transaction logic.
export const reservationRoutes = factory.createApp();

export const reservationParamsSchema = z.object({
  reservationId: uuidSchema,
});

export const reservationActionResponseDataSchema = z.object({
  reservationId: uuidSchema,
  status: z.enum(["PENDING", "RESERVED", "CANCELED"]).optional(),
});

export type ReservationParams = z.infer<typeof reservationParamsSchema>;
export type ReservationActionResponseData = z.infer<
  typeof reservationActionResponseDataSchema
>;

reservationRoutes.get("/reservations/:reservationId", (c) => {
  const params = reservationParamsSchema.parse(c.req.param());

  return c.json(
    ok("Fetched reservation placeholder", {
      reservationId: params.reservationId,
      status: "PENDING" as const,
    }),
  );
});

reservationRoutes.post("/reservations/:reservationId/cancel", (c) => {
  const params = reservationParamsSchema.parse(c.req.param());

  return c.json(
    ok("Canceled reservation placeholder", {
      reservationId: params.reservationId,
    }),
  );
});

reservationRoutes.post("/reservations/:reservationId/confirm", (c) => {
  const params = reservationParamsSchema.parse(c.req.param());

  return c.json(
    ok("Confirmed reservation placeholder", {
      reservationId: params.reservationId,
    }),
  );
});
