import { describe, expect, it } from "vitest";
import { app } from "@/app";

describe("health endpoint", () => {
  it("returns a healthy response when the database is reachable", async () => {
    const response = await app.request("/health");
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
