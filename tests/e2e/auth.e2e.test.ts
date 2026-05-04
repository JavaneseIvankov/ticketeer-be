import { beforeAll, describe, expect, it } from "vitest";
import {
  loginResponseSchema,
  meResponseSchema,
  registerResponseSchema,
} from "@/modules/auth/schemas";
import { e2eClient } from "./utils/client";
import { assertE2eDbResetEnabled } from "./utils/db";
import {
  getCurrentUser,
  makeUniqueEmail,
  registerAndLogin,
} from "./utils/fixtures";
import { parseErrorJson, parseJson } from "./utils/http";

describe("auth e2e", () => {
  beforeAll(() => {
    assertE2eDbResetEnabled();
  });

  it("registers a user, logs in, and fetches the current user", async () => {
    const registered = await registerAndLogin({
      role: "USER",
      name: "Alice",
      password: "secret123",
    });

    expect(registered.response.status).toBe(200);
    expect(registered.body).toEqual(
      registerResponseSchema.parse({
        status: "success",
        message: "User registered successfully",
        data: {
          userId: registered.body.data.userId,
          email: registered.payload.email,
          name: "Alice",
          role: "USER",
        },
      }),
    );

    expect(registered.loginResponse.status).toBe(200);
    expect(registered.loginBody).toEqual(
      loginResponseSchema.parse({
        status: "success",
        message: "Logged in successfully",
        data: {
          token: registered.token,
        },
      }),
    );

    const currentUser = await getCurrentUser(registered.token);
    expect(currentUser.response.status).toBe(200);
    expect(currentUser.body).toEqual(
      meResponseSchema.parse({
        status: "success",
        message: "Fetched current user",
        data: {
          userId: registered.body.data.userId,
          email: registered.payload.email,
          name: "Alice",
          role: "USER",
        },
      }),
    );
  });

  it("registers an organizer account", async () => {
    const email = makeUniqueEmail("organizer");
    const response = await e2eClient.api.v1.auth.register.$post({
      json: {
        email,
        password: "secret123",
        name: "Org Owner",
        role: "ORGANIZER",
      },
    });
    const body = await parseJson(response, registerResponseSchema);

    expect(response.status).toBe(200);
    expect(body.data.email).toBe(email);
    expect(body.data.role).toBe("ORGANIZER");
  });

  it("rejects duplicate email registration", async () => {
    const email = makeUniqueEmail("duplicate");
    await registerAndLogin({
      email,
      password: "secret123",
    });

    const response = await e2eClient.api.v1.auth.register.$post({
      json: {
        email,
        password: "secret123",
        name: "Another User",
        role: "USER",
      },
    });
    const body = await parseErrorJson(response);

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });

  it("rejects invalid credentials on login", async () => {
    const registered = await registerAndLogin({
      email: makeUniqueEmail("invalid-login"),
      password: "secret123",
    });

    const response = await e2eClient.api.v1.auth.login.$post({
      json: {
        email: registered.payload.email,
        password: "wrong-password",
      },
    });
    const body = await parseErrorJson(response);

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects missing auth when fetching current user", async () => {
    const response = await e2eClient.api.v1.auth.me.$get();
    const body = await parseErrorJson(response);

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.detail).toEqual({ reason: "missing_token" });
  });
});
