import { beforeAll, describe, expect, it } from "vitest";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  createDraftEvent,
  createPublishedReadyEvent,
  createSeatClass,
  createSeats,
  getSeat,
  listSeats,
  registerAndLogin,
} from "./utils/fixtures";

describe("seats e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("creates seats with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat Owner",
    });
    const event = await createDraftEvent(organizer.token);
    const seatClass = await createSeatClass(
      organizer.token,
      event.payload.slug,
    );

    const created = await createSeats(
      organizer.token,
      event.payload.slug,
      seatClass.body.data.seatClassId,
      {
        name: "B-7",
        row: "B",
        column: "7",
      },
    );

    expect(created.response.status).toBe(200);
    expect(created.body.data.createdCount).toBe(1);
    expect(created.body.data.seatIds).toHaveLength(1);
    expect(created.body.data.eventId).toBe(event.body.data.eventId);

    const fetched = await getSeat(
      event.payload.slug,
      created.body.data.seatIds[0],
    );
    expect(fetched.response.status).toBe(200);
    expect(fetched.body.data).toEqual(
      expect.objectContaining({
        seatId: created.body.data.seatIds[0],
        eventId: event.body.data.eventId,
        classId: seatClass.body.data.seatClassId,
        name: "B-7",
        row: "B",
        column: "7",
      }),
    );
  });

  it("lists seats with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat List Owner",
    });
    const event = await createDraftEvent(organizer.token);
    const seatClass = await createSeatClass(
      organizer.token,
      event.payload.slug,
    );
    const created = await createSeats(
      organizer.token,
      event.payload.slug,
      seatClass.body.data.seatClassId,
      {
        name: "C-3",
        row: "C",
        column: "3",
      },
    );
    const listed = await listSeats(event.payload.slug);

    expect(listed.response.status).toBe(200);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seatId: created.body.data.seatIds[0],
          eventId: event.body.data.eventId,
          classId: seatClass.body.data.seatClassId,
          name: "C-3",
          row: "C",
          column: "3",
        }),
      ]),
    );
  });

  it("gets a seat by id with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat Detail Owner",
    });
    const event = await createDraftEvent(organizer.token);
    const seatClass = await createSeatClass(
      organizer.token,
      event.payload.slug,
    );
    const created = await createSeats(
      organizer.token,
      event.payload.slug,
      seatClass.body.data.seatClassId,
      {
        name: "D-4",
        row: "D",
        column: "4",
      },
    );
    const fetched = await getSeat(
      event.payload.slug,
      created.body.data.seatIds[0],
    );

    expect(fetched.response.status).toBe(200);
    expect(fetched.body.data).toEqual(
      expect.objectContaining({
        seatId: created.body.data.seatIds[0],
        eventId: event.body.data.eventId,
        classId: seatClass.body.data.seatClassId,
        name: "D-4",
        row: "D",
        column: "4",
      }),
    );
  });

  it("rejects anonymous callers when creating seats", async () => {
    const response = await e2eClient.api.v1.events[":slug"].seats.$post({
      param: { slug: "sample-event" },
      json: {
        seats: [
          {
            name: "A-1",
            row: "A",
            column: "1",
            classId: crypto.randomUUID(),
          },
        ],
      },
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

  it("returns not found for an unknown seat id", async () => {
    const response = await e2eClient.api.v1.events[":slug"].seats[
      ":seatId"
    ].$get({
      param: {
        slug: "missing-event",
        seatId: crypto.randomUUID(),
      },
    });
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

  it("rejects a non-owner organizer when creating seats", async () => {
    const owner = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat Owner",
    });
    const otherOrganizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Other Organizer",
    });
    const event = await createDraftEvent(owner.token);
    const seatClass = await createSeatClass(owner.token, event.payload.slug);

    const response = await e2eClient.api.v1.events[":slug"].seats.$post(
      {
        param: { slug: event.payload.slug },
        json: {
          seats: [
            {
              name: "A-1",
              row: "A",
              column: "1",
              classId: seatClass.body.data.seatClassId,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${otherOrganizer.token}`,
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

  it("returns not found when creating seats for an unknown event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat Not Found Owner",
    });

    const response = await e2eClient.api.v1.events[":slug"].seats.$post(
      {
        param: { slug: "missing-event" },
        json: {
          seats: [
            {
              name: "A-1",
              row: "A",
              column: "1",
              classId: crypto.randomUUID(),
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${organizer.token}`,
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

  it("rejects seat creation after an event is published", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Published Seat Owner",
    });
    const ready = await createPublishedReadyEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].seats.$post(
      {
        param: { slug: ready.event.payload.slug },
        json: {
          seats: [
            {
              name: "Z-9",
              row: "Z",
              column: "9",
              classId: ready.seatClass.body.data.seatClassId,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${organizer.token}`,
        },
      },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual(
      expect.objectContaining({
        status: "error",
        error: expect.objectContaining({
          code: "EVENT_NOT_MUTABLE",
        }),
      }),
    );
  });
});
