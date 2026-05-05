import {
  loginResponseSchema,
  meResponseSchema,
  registerResponseSchema,
} from "@/modules/auth/schemas";
import {
  createEventReservationResponseSchema,
  createEventResponseSchema,
  createSeatClassResponseSchema,
  createSeatsResponseSchema,
  deleteEventResponseSchema,
  deleteSeatClassResponseSchema,
  getEventResponseSchema,
  getSeatClassResponseSchema,
  getSeatResponseSchema,
  listEventsResponseSchema,
  listSeatClassesResponseSchema,
  listSeatsResponseSchema,
  publishEventResponseSchema,
  updateEventResponseSchema,
  updateSeatClassResponseSchema,
} from "@/modules/events/schemas";
import { e2eClient } from "./client";
import {
  insertPayment,
  insertReservation,
  insertSeat,
  setEventCapacity,
  setReservationExpiredAt,
} from "./db";
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

export const listEvents = async () => {
  const response = await e2eClient.api.v1.events.$get();
  const body = await parseJson(response, listEventsResponseSchema);

  return {
    response,
    body,
  };
};

export const getEventBySlug = async (slug: string) => {
  const response = await e2eClient.api.v1.events[":slug"].$get({
    param: { slug },
  });
  const body = await parseJson(response, getEventResponseSchema);

  return {
    response,
    body,
  };
};

export const deleteEventBySlug = async (
  token: string | undefined,
  slug: string,
) => {
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const response = await e2eClient.api.v1.events[":slug"].$delete(
    {
      param: { slug },
    },
    headers ? { headers } : undefined,
  );
  const body = await parseJson(response, deleteEventResponseSchema);

  return {
    response,
    body,
  };
};

export const publishEvent = async (token: string | undefined, slug: string) => {
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const response = await e2eClient.api.v1.events[":slug"].publish.$post(
    {
      param: { slug },
    },
    headers ? { headers } : undefined,
  );
  const body = await parseJson(response, publishEventResponseSchema);

  return {
    response,
    body,
  };
};

export const createSeatClass = async (
  token: string,
  slug: string,
  input?: {
    name?: string;
    priceIdr?: number;
    seatClassSlug?: string;
  },
) => {
  const payload = {
    name: input?.name ?? "VIP",
    priceIdr: input?.priceIdr ?? 100_000,
    slug: input?.seatClassSlug ?? makeUniqueSlug("class"),
  };

  const response = await e2eClient.api.v1.events[":slug"]["seat-classes"].$post(
    {
      param: { slug },
      json: payload,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const body = await parseJson(response, createSeatClassResponseSchema);

  return {
    payload,
    response,
    body,
  };
};

export const listSeatClasses = async (slug: string) => {
  const response = await e2eClient.api.v1.events[":slug"]["seat-classes"].$get({
    param: { slug },
  });
  const body = await parseJson(response, listSeatClassesResponseSchema);

  return {
    response,
    body,
  };
};

export const getSeatClass = async (slug: string, seatClassId: string) => {
  const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
    ":seatClassId"
  ].$get({
    param: { slug, seatClassId },
  });
  const body = await parseJson(response, getSeatClassResponseSchema);

  return {
    response,
    body,
  };
};

export const updateSeatClass = async (
  token: string | undefined,
  slug: string,
  seatClassId: string,
  input?: {
    name?: string;
    priceIdr?: number;
    seatClassSlug?: string;
  },
) => {
  const payload = {
    name: input?.name ?? "Updated VIP",
    priceIdr: input?.priceIdr ?? 150_000,
    slug: input?.seatClassSlug ?? makeUniqueSlug("class"),
  };
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
    ":seatClassId"
  ].$patch(
    {
      param: { slug, seatClassId },
      json: payload,
    },
    headers ? { headers } : undefined,
  );
  const body = await parseJson(response, updateSeatClassResponseSchema);

  return {
    payload,
    response,
    body,
  };
};

export const deleteSeatClass = async (
  token: string | undefined,
  slug: string,
  seatClassId: string,
) => {
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const response = await e2eClient.api.v1.events[":slug"]["seat-classes"][
    ":seatClassId"
  ].$delete(
    {
      param: { slug, seatClassId },
    },
    headers ? { headers } : undefined,
  );
  const body = await parseJson(response, deleteSeatClassResponseSchema);

  return {
    response,
    body,
  };
};

export const createSeats = async (
  token: string | undefined,
  slug: string,
  classId: string,
  input?: {
    name?: string;
    row?: string;
    column?: string;
  },
) => {
  const payload = {
    seats: [
      {
        name: input?.name ?? "A-1",
        row: input?.row ?? "A",
        column: input?.column ?? "1",
        classId,
      },
    ],
  };
  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;

  const response = await e2eClient.api.v1.events[":slug"].seats.$post(
    {
      param: { slug },
      json: payload,
    },
    headers ? { headers } : undefined,
  );
  const body = await parseJson(response, createSeatsResponseSchema);

  return {
    payload,
    response,
    body,
  };
};

export const listSeats = async (slug: string) => {
  const response = await e2eClient.api.v1.events[":slug"].seats.$get({
    param: { slug },
  });
  const body = await parseJson(response, listSeatsResponseSchema);

  return {
    response,
    body,
  };
};

export const getSeat = async (slug: string, seatId: string) => {
  const response = await e2eClient.api.v1.events[":slug"].seats[":seatId"].$get(
    {
      param: { slug, seatId },
    },
  );
  const body = await parseJson(response, getSeatResponseSchema);

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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (input.token) {
    headers.Authorization = `Bearer ${input.token}`;
  }

  const response = await e2eClient.api.v1.events[":slug"].reservations.$post(
    {
      param: { slug },
      json: { seatId },
    },
    {
      headers,
    },
  );

  return {
    response,
    slug,
    seatId,
  };
};

export const createPublishedReadyEvent = async (organizerToken: string) => {
  const event = await createDraftEvent(organizerToken);
  const seatClass = await createSeatClass(organizerToken, event.payload.slug);
  const seatId = await insertSeat({
    eventId: event.body.data.eventId,
    classId: seatClass.body.data.seatClassId,
  });
  await setEventCapacity(event.body.data.eventId, 1);

  return {
    event,
    seatClass,
    seatId,
  };
};

export const createPersistedReservationFixture = async (input?: {
  reservationStatus?: "PENDING" | "RESERVED" | "CANCELED";
  paymentStatus?: "PENDING" | "PAID" | "FAILED";
  expiredAt?: Date;
}) => {
  const organizer = await registerAndLogin({
    role: "ORGANIZER",
    name: "Fixture Organizer",
  });
  const owner = await registerAndLogin({
    role: "USER",
    name: "Fixture Owner",
  });
  const event = await createDraftEvent(organizer.token);
  const seatClass = await createSeatClass(organizer.token, event.payload.slug);
  const seatId = await insertSeat({
    eventId: event.body.data.eventId,
    classId: seatClass.body.data.seatClassId,
  });
  await setEventCapacity(event.body.data.eventId, 1);

  const paymentId = await insertPayment({
    status: input?.paymentStatus ?? "PENDING",
  });
  const reservationId = await insertReservation({
    userId: owner.body.data.userId,
    eventId: event.body.data.eventId,
    seatId,
    paymentId,
    status: input?.reservationStatus ?? "PENDING",
    expiredAt: input?.expiredAt,
  });

  return {
    organizer,
    owner,
    event,
    seatClass,
    seatId,
    paymentId,
    reservationId,
  };
};

export const expireReservationFixture = async (reservationId: string) => {
  const expiredAt = new Date(Date.now() - 60_000);
  await setReservationExpiredAt(reservationId, expiredAt);
  return expiredAt;
};
