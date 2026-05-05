import { beforeAll, describe, expect, it } from "vitest";
import {
  createEventResponseSchema,
  updateEventResponseSchema,
} from "@/modules/events/schemas";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  createDraftEvent,
  createPublishedReadyEvent,
  deleteEventBySlug,
  getEventBySlug,
  listEvents,
  publishEvent,
  registerAndLogin,
  updateDraftEvent,
} from "./utils/fixtures";
import { parseErrorJson, parseJson } from "./utils/http";

describe("events e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("allows an organizer to create and update a draft event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Organizer One",
    });

    const created = await createDraftEvent(organizer.token);
    expect(created.response.status).toBe(200);
    expect(created.body).toEqual(
      createEventResponseSchema.parse({
        status: "success",
        message: "Successfully created event",
        data: {
          eventId: created.body.data.eventId,
          slug: created.payload.slug,
          status: "DRAFT",
        },
      }),
    );

    const updated = await updateDraftEvent(
      organizer.token,
      created.payload.slug,
      {
        description: "Updated Description",
        openedAt: "2030-01-01T00:00:00.000Z",
        closedAt: "2030-01-03T00:00:00.000Z",
      },
    );

    expect(updated.response.status).toBe(200);
    expect(updated.body).toEqual(
      updateEventResponseSchema.parse({
        status: "success",
        message: "Updated event",
        data: {
          eventId: created.body.data.eventId,
          slug: created.payload.slug,
          status: "DRAFT",
        },
      }),
    );
  });

  it("lists events with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "List Owner",
    });
    const created = await createDraftEvent(organizer.token, {
      name: "Listed Event",
      description: "Listed Description",
    });

    const listed = await listEvents();

    expect(listed.response.status).toBe(200);
    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: created.body.data.eventId,
          slug: created.payload.slug,
          name: created.payload.name,
          description: created.payload.description,
        }),
      ]),
    );
  });

  it("gets an event by slug with the contract response shape", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Detail Owner",
    });
    const created = await createDraftEvent(organizer.token, {
      name: "Detailed Event",
      description: "Detailed Description",
    });
    const event = await getEventBySlug(created.payload.slug);

    expect(event.response.status).toBe(200);
    expect(event.body.data.eventId).toBe(created.body.data.eventId);
    expect(event.body.data.slug).toBe(created.payload.slug);
    expect(event.body.data.name).toBe(created.payload.name);
    expect(event.body.data.description).toBe(created.payload.description);
    expect(event.body.data.openedAt).toBeInstanceOf(Date);
  });

  it("returns not found for an unknown event slug", async () => {
    const response = await e2eClient.api.v1.events[":slug"].$get({
      param: { slug: "missing-event" },
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

  it("forbids a USER from creating an event", async () => {
    const user = await registerAndLogin({
      role: "USER",
      name: "Plain User",
    });

    const response = await e2eClient.api.v1.events.$post(
      {
        json: {
          slug: `user-event-${Date.now()}`,
          name: "Should Fail",
          description: "Forbidden",
          openedAt: "2030-01-01T00:00:00.000Z",
          closedAt: "2030-01-02T00:00:00.000Z",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      },
    );
    const body = await parseErrorJson(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids a different organizer from updating another organizer's event", async () => {
    const organizerA = await registerAndLogin({
      role: "ORGANIZER",
      name: "Owner Organizer",
    });
    const organizerB = await registerAndLogin({
      role: "ORGANIZER",
      name: "Other Organizer",
    });
    const created = await createDraftEvent(organizerA.token);

    const response = await e2eClient.api.v1.events[":slug"].$patch(
      {
        param: { slug: created.payload.slug },
        json: {
          description: "Unauthorized update",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${organizerB.token}`,
        },
      },
    );
    const body = await parseErrorJson(response);

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows the owner organizer to delete a draft event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Owner Organizer",
    });
    const created = await createDraftEvent(organizer.token);

    const deleted = await deleteEventBySlug(
      organizer.token,
      created.payload.slug,
    );

    expect(deleted.response.status).toBe(200);
    expect(deleted.body.data).toEqual({
      eventId: deleted.body.data.eventId,
      slug: created.payload.slug,
    });
  });

  it("rejects anonymous callers when deleting an event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const created = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].$delete({
      param: { slug: created.payload.slug },
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

  it("rejects a USER when deleting an event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const user = await registerAndLogin({
      role: "USER",
    });
    const created = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].$delete(
      {
        param: { slug: created.payload.slug },
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

  it("rejects a non-owner organizer when deleting an event", async () => {
    const organizerA = await registerAndLogin({
      role: "ORGANIZER",
    });
    const organizerB = await registerAndLogin({
      role: "ORGANIZER",
    });
    const created = await createDraftEvent(organizerA.token);

    const response = await e2eClient.api.v1.events[":slug"].$delete(
      {
        param: { slug: created.payload.slug },
      },
      {
        headers: {
          Authorization: `Bearer ${organizerB.token}`,
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

  it("rejects publishing a draft event with zero capacity", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const created = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].publish.$post(
      {
        param: { slug: created.payload.slug },
      },
      {
        headers: {
          Authorization: `Bearer ${organizer.token}`,
        },
      },
    );
    const body = await parseErrorJson(response);

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("publishes a draft event when inventory is ready", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
      name: "Publish Owner",
    });
    const ready = await createPublishedReadyEvent(organizer.token);

    const published = await publishEvent(
      organizer.token,
      ready.event.payload.slug,
    );

    expect(published.response.status).toBe(200);
    expect(published.body.data).toEqual({
      eventId: ready.event.body.data.eventId,
      slug: ready.event.payload.slug,
      status: "PUBLISHED",
    });
  });

  it("rejects anonymous callers when publishing an event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const created = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].publish.$post({
      param: { slug: created.payload.slug },
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

  it("rejects a USER when publishing an event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });
    const user = await registerAndLogin({
      role: "USER",
    });
    const created = await createDraftEvent(organizer.token);

    const response = await e2eClient.api.v1.events[":slug"].publish.$post(
      {
        param: { slug: created.payload.slug },
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

  it("rejects a non-owner organizer when publishing an event", async () => {
    const organizerA = await registerAndLogin({
      role: "ORGANIZER",
    });
    const organizerB = await registerAndLogin({
      role: "ORGANIZER",
    });
    const ready = await createPublishedReadyEvent(organizerA.token);

    const response = await e2eClient.api.v1.events[":slug"].publish.$post(
      {
        param: { slug: ready.event.payload.slug },
      },
      {
        headers: {
          Authorization: `Bearer ${organizerB.token}`,
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

  it("returns not found when publishing an unknown event", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });

    const response = await e2eClient.api.v1.events[":slug"].publish.$post(
      {
        param: { slug: "missing-event" },
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

  it("rejects an invalid booking window at creation time", async () => {
    const organizer = await registerAndLogin({
      role: "ORGANIZER",
    });

    const response = await e2eClient.api.v1.events.$post(
      {
        json: {
          slug: `bad-window-${Date.now()}`,
          name: "Bad Window",
          description: "Invalid window",
          openedAt: "2030-01-02T00:00:00.000Z",
          closedAt: "2030-01-01T00:00:00.000Z",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${organizer.token}`,
        },
      },
    );
    const body = await parseErrorJson(response);

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
