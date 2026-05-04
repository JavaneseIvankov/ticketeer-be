import { beforeAll, describe, expect, it } from "vitest";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  makeUniqueSlug,
  postReservationHold,
  registerAndLogin,
} from "./utils/fixtures";

describe("critical reservation flows e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("rejects a second active reservation for the same seat", async () => {
    const user = await registerAndLogin({
      role: "USER",
      name: "Seat Holder",
    });
    const slug = makeUniqueSlug("event");
    const seatId = crypto.randomUUID();

    const { response: firstResponse } = await postReservationHold({
      slug,
      seatId,
      token: user.token,
    });
    const { response: secondResponse } = await postReservationHold({
      slug,
      seatId,
      token: user.token,
    });
    const secondBody = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);
    expect(secondBody).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "SEAT_ALREADY_RESERVED",
        }),
      }),
    );
  });

  it("allows only one winner in a parallel reserve race for the same seat", async () => {
    const user = await registerAndLogin({
      role: "USER",
      name: "Concurrent Holder",
    });
    const slug = makeUniqueSlug("event");
    const seatId = crypto.randomUUID();

    const [firstResponse, secondResponse] = await Promise.all([
      postReservationHold({
        slug,
        seatId,
        token: user.token,
      }).then(({ response }) => response),
      postReservationHold({
        slug,
        seatId,
        token: user.token,
      }).then(({ response }) => response),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort();

    expect(statuses).toEqual([200, 409]);
  });
});
