import { beforeAll, describe, expect, it } from "vitest";
import {
  cancelReservationResponseSchema,
  confirmReservationResponseSchema,
  getReservationResponseSchema,
} from "@/modules/reservations/schemas";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  createReservationHold,
  postReservationHold,
  registerAndLogin,
} from "./utils/fixtures";
import { parseJson } from "./utils/http";

describe("reservations e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("rejects anonymous callers when creating a reservation hold", async () => {
    const { response } = await postReservationHold({
      slug: "public-event",
      seatId: crypto.randomUUID(),
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

  it("returns the reservation detail for the owner", async () => {
    const user = await registerAndLogin({
      role: "USER",
      name: "Reservation Owner",
    });
    const hold = await createReservationHold({
      token: user.token,
    });

    const response = await e2eClient.api.v1.reservations[":reservationId"].$get(
      {
        param: { reservationId: hold.body.data.reservationId },
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      },
    );
    const body = await parseJson(response, getReservationResponseSchema);

    expect(response.status).toBe(200);
    expect(body.data.reservationId).toBe(hold.body.data.reservationId);
    expect(body.data.paymentId).toBe(hold.body.data.paymentId);
    expect(body.data.expiredAt).toBeInstanceOf(Date);
  });

  it("rejects anonymous callers when fetching a reservation", async () => {
    const hold = await createReservationHold({
      token: (await registerAndLogin({ role: "USER" })).token,
    });

    const response = await e2eClient.api.v1.reservations[":reservationId"].$get(
      {
        param: { reservationId: hold.body.data.reservationId },
      },
    );
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

  it("rejects non-owners when fetching a reservation", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Reservation Owner",
    });
    const otherUser = await registerAndLogin({
      role: "USER",
      name: "Other User",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.reservations[":reservationId"].$get(
      {
        param: { reservationId: hold.body.data.reservationId },
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

  it("rejects anonymous callers when canceling a reservation", async () => {
    const hold = await createReservationHold({
      token: (await registerAndLogin({ role: "USER" })).token,
    });

    const response = await e2eClient.api.v1.reservations[
      ":reservationId"
    ].cancel.$post({
      param: { reservationId: hold.body.data.reservationId },
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

  it("allows the owner to cancel a pending reservation", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Reservation Owner",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.reservations[
      ":reservationId"
    ].cancel.$post(
      {
        param: { reservationId: hold.body.data.reservationId },
      },
      {
        headers: {
          Authorization: `Bearer ${owner.token}`,
        },
      },
    );
    const body = await parseJson(response, cancelReservationResponseSchema);

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      reservationId: hold.body.data.reservationId,
      status: "CANCELED",
    });
  });

  it("fails confirm at the strict expiry boundary", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Reservation Owner",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.reservations[
      ":reservationId"
    ].confirm.$post(
      {
        param: { reservationId: hold.body.data.reservationId },
      },
      {
        headers: {
          Authorization: `Bearer ${owner.token}`,
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "RESERVATION_EXPIRED",
        }),
      }),
    );
  });

  it("returns the confirmed reservation payload after a successful confirm", async () => {
    const owner = await registerAndLogin({
      role: "USER",
      name: "Reservation Owner",
    });
    const hold = await createReservationHold({
      token: owner.token,
    });

    const response = await e2eClient.api.v1.reservations[
      ":reservationId"
    ].confirm.$post(
      {
        param: { reservationId: hold.body.data.reservationId },
      },
      {
        headers: {
          Authorization: `Bearer ${owner.token}`,
        },
      },
    );
    const body = await parseJson(response, confirmReservationResponseSchema);

    expect(response.status).toBe(200);
    expect(body.data.reservationId).toBe(hold.body.data.reservationId);
    expect(body.data.paymentId).toBe(hold.body.data.paymentId);
    expect(body.data.paymentStatus).toBe("PAID");
    expect(body.data.status).toBe("RESERVED");
  });
});
