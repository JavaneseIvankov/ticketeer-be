import { describe, expect, it } from "vitest";
import { e2eClient } from "./utils/client";

describe("health endpoint", () => {
  it("returns a healthy response when the database is reachable", async () => {
    const response = await e2eClient.health.$get();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "success",
      message: "OK",
      data: {
        connected: true,
      },
    });
  });
});
