import { Hono } from "hono";
import { z } from "zod";

import { ok, uuidSchema } from "@/shared/http";

// Purpose: `src/modules/payments/index.ts` is the collapsed entrypoint for the
// Week 1 payment stub domain, including payment reads and helpers used by the
// reservation confirmation flow.
export const paymentRoutes = new Hono();

export const paymentParamsSchema = z.object({
  paymentId: uuidSchema
});

export const paymentResponseDataSchema = z.object({
  paymentId: uuidSchema,
  status: z.enum(["PENDING", "PAID", "FAILED"])
});

export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type PaymentResponseData = z.infer<typeof paymentResponseDataSchema>;

paymentRoutes.get("/payments/:paymentId", (c) => {
  const params = paymentParamsSchema.parse(c.req.param());

  return c.json(
    ok("Fetched payment placeholder", {
      paymentId: params.paymentId,
      status: "PENDING" as const
    })
  );
});
