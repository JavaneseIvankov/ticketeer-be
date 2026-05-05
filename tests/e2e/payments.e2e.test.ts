import { beforeAll, describe, expect, it } from "vitest";
import { getPaymentResponseSchema } from "@/modules/payments/schemas";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import { createReservationHold, registerAndLogin } from "./utils/fixtures";
import { parseJson } from "./utils/http";

describe("payments e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("returns the payment detail for the owner", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Payment Owner",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.payments[":paymentId"].$get(
      {
        param: { paymentId: hold.body.data.paymentId },
      },
      {
        headers: {
          Authorization: `Bearer ${owner.token}`,
        },
      },
    );
    const body = await parseJson(response, getPaymentResponseSchema);

    expect(response.status).toBe(200);
    expect(body.data.paymentId).toBe(hold.body.data.paymentId);
    expect(body.data.status).toBe("PENDING");
    expect(body.data.amountIdr).toBeGreaterThanOrEqual(0);
  });

  it("rejects anonymous callers when fetching a payment", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Payment Owner",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.payments[":paymentId"].$get({
      param: { paymentId: hold.body.data.paymentId },
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "UNAUTHORIZED",
        }),
      }),
    );
  });

  it("rejects non-owners when fetching a payment", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Payment Owner",
    });
    const otherUser = await registerAndLogin({
      role: "USER",
      name: "Other User",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.payments[":paymentId"].$get(
      {
        param: { paymentId: hold.body.data.paymentId },
      },
      {
        headers: {
          Authorization: `Bearer ${otherUser.token}`,
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "FORBIDDEN",
        }),
      }),
    );
  });

  it("returns not found for an unknown payment id", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Payment Owner",
    });

    const response = await e2eClient.api.v1.payments[":paymentId"].$get(
      {
        param: { paymentId: crypto.randomUUID() },
      },
      {
        headers: {
          Authorization: `Bearer ${owner.token}`,
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "NOT_FOUND",
        }),
      }),
    );
  });
});
