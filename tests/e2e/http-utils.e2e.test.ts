import { describe, expect, it } from "vitest";
import { getEventResponseSchema } from "@/modules/events/schemas";
import { parseJson } from "./utils/http";

describe("http parsing helper", () => {
  it("revives ISO datetime strings before validating Date-based response schemas", async () => {
    const response = new Response(
      JSON.stringify({
        status: "success",
        message: "Fetched event",
        data: {
          eventId: crypto.randomUUID(),
          slug: "sample-event",
          name: "Sample Event",
          description: "Sample Description",
          status: "PUBLISHED",
          openedAt: "2030-01-01T00:00:00.000Z",
          closedAt: "2030-01-02T00:00:00.000Z",
          availability: {
            capacity: 10,
            allocated: 3,
            held: 2,
            available: 5,
          },
        },
      }),
    );

    const body = await parseJson(response, getEventResponseSchema);

    expect(body.data.openedAt).toBeInstanceOf(Date);
    expect(body.data.openedAt.toISOString()).toBe("2030-01-01T00:00:00.000Z");
    expect(body.data.closedAt).toBeInstanceOf(Date);
  });

  it("rejects invalid datetime strings in serialized responses", async () => {
    const response = new Response(
      JSON.stringify({
        status: "success",
        message: "Fetched event",
        data: {
          eventId: crypto.randomUUID(),
          slug: "sample-event",
          name: "Sample Event",
          description: "Sample Description",
          status: "PUBLISHED",
          openedAt: "not-a-date",
          closedAt: null,
          availability: {
            capacity: 10,
            allocated: 3,
            held: 2,
            available: 5,
          },
        },
      }),
    );

    await expect(parseJson(response, getEventResponseSchema)).rejects.toThrow();
  });
});
