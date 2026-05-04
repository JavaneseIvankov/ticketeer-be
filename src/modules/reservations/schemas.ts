import { z } from "zod";
import {
  dateValueSchema,
  successEnvelopeSchema,
  uuidSchema,
} from "@/shared/http";

export const reservationStatusSchema = z.enum([
  "PENDING",
  "RESERVED",
  "CANCELED",
]);

export const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED"]);

export const reservationParamsSchema = z.object({
  reservationId: uuidSchema,
});

export const getReservationResponseDataSchema = z.object({
  reservationId: uuidSchema,
  status: reservationStatusSchema,
  expiredAt: dateValueSchema,
  eventId: uuidSchema,
  seatId: uuidSchema,
  paymentId: uuidSchema,
  paymentStatus: paymentStatusSchema,
});

export const cancelReservationResponseDataSchema = z.object({
  reservationId: uuidSchema,
  status: reservationStatusSchema,
});

export const confirmReservationResponseDataSchema = z.object({
  reservationId: uuidSchema,
  status: reservationStatusSchema,
  paymentId: uuidSchema,
  paymentStatus: paymentStatusSchema,
});

export const getReservationResponseSchema = successEnvelopeSchema(
  getReservationResponseDataSchema,
);
export const cancelReservationResponseSchema = successEnvelopeSchema(
  cancelReservationResponseDataSchema,
);
export const confirmReservationResponseSchema = successEnvelopeSchema(
  confirmReservationResponseDataSchema,
);

export type ReservationParams = z.infer<typeof reservationParamsSchema>;
export type GetReservationResponseData = z.infer<
  typeof getReservationResponseDataSchema
>;
export type CancelReservationResponseData = z.infer<
  typeof cancelReservationResponseDataSchema
>;
export type ConfirmReservationResponseData = z.infer<
  typeof confirmReservationResponseDataSchema
>;
