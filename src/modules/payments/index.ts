import { Hono } from "hono";

// Purpose: `src/modules/payments/index.ts` is the collapsed entrypoint for the
// Week 1 payment stub domain, including payment reads and helpers used by the
// reservation confirmation flow.
export const paymentRoutes = new Hono();

paymentRoutes.get("/payments/:paymentId", (c) =>
  c.json({
    status: "success",
    message: "Payments module placeholder",
    data: { paymentId: c.req.param("paymentId") }
  })
);
