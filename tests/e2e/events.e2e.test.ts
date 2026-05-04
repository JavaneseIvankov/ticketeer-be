import { beforeAll, describe, expect, it } from "vitest";
import {
  createEventResponseSchema,
  updateEventResponseSchema,
} from "@/modules/events/schemas";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  createDraftEvent,
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
