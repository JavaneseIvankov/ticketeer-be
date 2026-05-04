import { factory } from "@/config/app";

import { ok } from "@/shared/http";
import { paymentParamsSchema } from "./schemas";

// Purpose: `src/modules/payments/index.ts` is the collapsed entrypoint for the
// Week 1 payment stub domain, including payment reads and helpers used by the
// reservation confirmation flow.
export const paymentRoutes = factory
  .createApp()
  .get("/payments/:paymentId", (c) => {
    const params = paymentParamsSchema.parse(c.req.param());

    return c.json(
      ok("Fetched payment placeholder", {
        paymentId: params.paymentId,
        reservationId: "00000000-0000-0000-0000-000000000000",
        status: "PENDING" as const,
        amountIdr: 0,
      }),
    );
  });
