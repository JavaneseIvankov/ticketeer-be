import { z } from "zod";
import { successEnvelopeSchema, uuidSchema } from "@/shared/http";

export const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED"]);

export const paymentParamsSchema = z.object({
  paymentId: uuidSchema,
});

export const getPaymentResponseDataSchema = z.object({
  paymentId: uuidSchema,
  reservationId: uuidSchema,
  status: paymentStatusSchema,
  amountIdr: z.int().min(0),
});

export const getPaymentResponseSchema = successEnvelopeSchema(
  getPaymentResponseDataSchema,
);

export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type GetPaymentResponseData = z.infer<
  typeof getPaymentResponseDataSchema
>;
