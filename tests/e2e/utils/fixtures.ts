import { app } from "@/app";
import {
  loginResponseSchema,
  meResponseSchema,
  registerResponseSchema,
} from "@/modules/auth/schemas";
import {
  createEventReservationResponseSchema,
  createEventResponseSchema,
  updateEventResponseSchema,
} from "@/modules/events/schemas";
import { e2eClient } from "./client";
import { parseJson } from "./http";

export const makeUniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export const makeUniqueSlug = (label = "evt") =>
  `${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(
    0,
    20,
  );

export const registerUser = async (input?: {
  email?: string;
  password?: string;
  name?: string;
  role?: "USER" | "ORGANIZER";
}) => {
  const payload = {
    email: input?.email ?? makeUniqueEmail("user"),
    password: input?.password ?? "secret123",
    name: input?.name ?? "Test User",
    role: input?.role ?? ("USER" as const),
  };

  const response = await e2eClient.api.v1.auth.register.$post({
    json: payload,
  });
  const body = await parseJson(response, registerResponseSchema);

  return {
    payload,
    response,
    body,
  };
};

export const loginUser = async (payload: {
  email: string;
  password: string;
}) => {
  const response = await e2eClient.api.v1.auth.login.$post({
    json: payload,
  });
  const body = await parseJson(response, loginResponseSchema);

  return {
    response,
    body,
  };
};

export const registerAndLogin = async (input?: {
  email?: string;
  password?: string;
  name?: string;
  role?: "USER" | "ORGANIZER";
}) => {
  const registered = await registerUser(input);
  const loggedIn = await loginUser({
    email: registered.payload.email,
    password: registered.payload.password,
  });

  return {
    ...registered,
    token: loggedIn.body.data.token,
    loginResponse: loggedIn.response,
    loginBody: loggedIn.body,
  };
};

export const getCurrentUser = async (token: string) => {
  const response = await e2eClient.api.v1.auth.me.$get(
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await parseJson(response, meResponseSchema);

  return {
    response,
    body,
  };
};

export const createDraftEvent = async (
  token: string,
  input?: {
    slug?: string;
    name?: string;
    description?: string;
    openedAt?: string;
    closedAt?: string;
  },
) => {
  const payload = {
    slug: input?.slug ?? makeUniqueSlug(),
    name: input?.name ?? "Sample Event",
    description: input?.description ?? "Sample Description",
    openedAt: input?.openedAt ?? "2030-01-01T00:00:00.000Z",
    closedAt: input?.closedAt ?? "2030-01-02T00:00:00.000Z",
  };

  const response = await e2eClient.api.v1.events.$post(
    {
      json: payload,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await parseJson(response, createEventResponseSchema);

  return {
    payload,
    response,
    body,
  };
};

export const updateDraftEvent = async (
  token: string,
  slug: string,
  input: {
    description?: string;
    openedAt?: string;
    closedAt?: string | null;
  },
) => {
  const response = await e2eClient.api.v1.events[":slug"].$patch(
    {
      param: { slug },
      json: input,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await parseJson(response, updateEventResponseSchema);

  return {
    response,
    body,
  };
};

export const createReservationHold = async (input: {
  slug?: string;
  seatId?: string;
  token?: string;
}) => {
  const slug = input.slug ?? makeUniqueSlug("event");
  const seatId = input.seatId ?? crypto.randomUUID();
  const { response } = await postReservationHold({
    slug,
    seatId,
    token: input.token,
  });
  const body = await parseJson(response, createEventReservationResponseSchema);

  return {
    response,
    body,
    slug,
    seatId,
  };
};

export const postReservationHold = async (input: {
  slug?: string;
  seatId?: string;
  token?: string;
}) => {
  const slug = input.slug ?? makeUniqueSlug("event");
  const seatId = input.seatId ?? crypto.randomUUID();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (input.token) {
    headers.set("Authorization", `Bearer ${input.token}`);
  }

  const response = await app.request(`/api/v1/events/${slug}/reservations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ seatId }),
  });

  return {
    response,
    slug,
    seatId,
  };
};
