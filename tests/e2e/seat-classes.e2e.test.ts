import { beforeAll, describe, expect, it } from "vitest";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  createDraftEvent,
  createPublishedReadyEvent,
  createSeatClass,
  deleteSeatClass,
  getSeatClass,
  listSeatClasses,
  registerAndLogin,
  updateSeatClass,
} from "./utils/fixtures";

describe("seat classes e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("creates and lists seat classes for an event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Seat Class Owner",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);
    const listed = await listSeatClasses(event.payload.slug);

    expect(created.response.status).toBe(200);
    expect(created.body.data.eventId).toBe(event.body.data.eventId);
    expect(listed.response.status).toBe(200);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          seatClassId: created.body.data.seatClassId,
          eventId: event.body.data.eventId,
          name: created.payload.name,
          priceIdr: created.payload.priceIdr,
        }),
      ]),
    );
  });

  it("gets a seat class by id with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);

    const fetched = await getSeatClass(
      event.payload.slug,
      created.body.data.seatClassId,
    );

    expect(fetched.response.status).toBe(200);
    expect(fetched.body.data).toEqual(
      expect.objectContaining({
        seatClassId: created.body.data.seatClassId,
        eventId: event.body.data.eventId,
        name: created.payload.name,
        priceIdr: created.payload.priceIdr,
      }),
    );
  });

  it("updates a seat class for the owner organizer", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);

    const updated = await updateSeatClass(
      organizer.token,
      event.payload.slug,
      created.body.data.seatClassId,
    );

    expect(updated.response.status).toBe(200);
    expect(updated.body.data.seatClassId).toBe(created.body.data.seatClassId);
  });

  it("rejects anonymous callers when updating a seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$patch({
      param: {
        slug: event.payload.slug,
        seatClassId: created.body.data.seatClassId,
      },
      json: {
        name: "Anonymous Update",
        priceIdr: 50_000,
        slug: "anon-update",
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

  it("rejects anonymous callers when creating a seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"][
      "seat-classes"
    ].$post({
      param: { slug: event.payload.slug },
      json: {
        name: "Anonymous Class",
        priceIdr: 50_000,
        slug: "anon-class",
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

  it("rejects a USER when creating a seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const user = await registerAndLogin({
      role: "USER",
    });
    const event = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"][
      "seat-classes"
    ].$post(
      {
        param: { slug: event.payload.slug },
        json: {
          name: "User Class",
          priceIdr: 50_000,
          slug: "user-class",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
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

  it("rejects a non-owner organizer when creating a seat class", async () => {
    const owner = await registerAndLogin({
      role: "ORGANIZER",
    });
    const otherOrganizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(owner.token);

    const response = await e2eClient.api.v1.events[":slug"][
      "seat-classes"
    ].$post(
      {
        param: { slug: event.payload.slug },
        json: {
          name: "Foreign Class",
          priceIdr: 50_000,
          slug: "foreign-class",
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

  it("rejects duplicate seat class slugs within the same event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const duplicateSlug = "vip-duplicate";
    await createSeatClass(organizer.token, event.payload.slug, {
      seatClassSlug: duplicateSlug,
    });

    const response = await e2eClient.api.v1.events[":slug"][
      "seat-classes"
    ].$post(
      {
        param: { slug: event.payload.slug },
        json: {
          name: "Duplicate VIP",
          priceIdr: 125_000,
          slug: duplicateSlug,
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
          code: "SEAT_SLUG_EXISTS",
        }),
      }),
    );
  });

  it("rejects seat class creation after an event is published", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const ready = await createPublishedReadyEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"][
      "seat-classes"
    ].$post(
      {
        param: { slug: ready.event.payload.slug },
        json: {
          name: "Late Class",
          priceIdr: 90_000,
          slug: "late-class",
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

  it("deletes a seat class for the owner organizer", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);

    const deleted = await deleteSeatClass(
      organizer.token,
      event.payload.slug,
      created.body.data.seatClassId,
    );

    expect(deleted.response.status).toBe(200);
    expect(deleted.body.data.seatClassId).toBe(created.body.data.seatClassId);
  });

  it("rejects a non-owner organizer when updating a seat class", async () => {
    const owner = await registerAndLogin({
      role: "ORGANIZER",
    });
    const otherOrganizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(owner.token);
    const created = await createSeatClass(owner.token, event.payload.slug);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$patch(
      {
        param: {
          slug: event.payload.slug,
          seatClassId: created.body.data.seatClassId,
        },
        json: {
          name: "Foreign Update",
          priceIdr: 70_000,
          slug: "foreign-update",
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

  it("returns not found when updating an unknown seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$patch(
      {
        param: {
          slug: event.payload.slug,
          seatClassId: crypto.randomUUID(),
        },
        json: {
          name: "Missing Update",
          priceIdr: 80_000,
          slug: "missing-update",
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

  it("rejects seat class updates after an event is published", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const ready = await createPublishedReadyEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$patch(
      {
        param: {
          slug: ready.event.payload.slug,
          seatClassId: ready.seatClass.body.data.seatClassId,
        },
        json: {
          name: "Published Update",
          priceIdr: 180_000,
          slug: "published-update",
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

  it("rejects anonymous callers when deleting a seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);
    const created = await createSeatClass(organizer.token, event.payload.slug);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$delete({
      param: {
        slug: event.payload.slug,
        seatClassId: created.body.data.seatClassId,
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

  it("rejects a non-owner organizer when deleting a seat class", async () => {
    const owner = await registerAndLogin({
      role: "ORGANIZER",
    });
    const otherOrganizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(owner.token);
    const created = await createSeatClass(owner.token, event.payload.slug);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$delete(
      {
        param: {
          slug: event.payload.slug,
          seatClassId: created.body.data.seatClassId,
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

  it("returns not found when deleting an unknown seat class", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const event = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$delete(
      {
        param: {
          slug: event.payload.slug,
          seatClassId: crypto.randomUUID(),
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

  it("returns not found for an unknown seat class id", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });

    const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
      ":seatClassId"
    ].$get({
      param: {
        slug: "missing-event",
        seatClassId: crypto.randomUUID(),
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
});
