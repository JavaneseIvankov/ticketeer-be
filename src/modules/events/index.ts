import { factory } from "@/config/app";
import { db } from "@/db/client";
import { CONSTRAINT } from "@/db/schema";
import { isConstraint, NotFoundError } from "@/db/utils";
import { requireRole } from "@/shared/auth";
import { err, ok } from "@/shared/http";
import { isBefore } from "@/shared/utils";
import { zValidator } from "@/shared/validation";
import {
  createEvent,
  createSeatClass,
  getEventBySlug,
  updateEvent,
} from "./operations";
import {
  type CreateSeatClassBody,
  createEventBodySchema,
  createEventReservationBodySchema,
  createSeatClassBodySchema,
  createSeatsBodySchema,
  eventSlugParamsSchema,
  seatClassParamsSchema,
  seatParamsSchema,
  updateEventBodySchema,
  updateSeatClassBodySchema,
} from "./schemas";

// Purpose: `src/modules/events/index.ts` is the collapsed entrypoint for the
// events domain. It groups event CRUD, publish rules, seat classes, seats, and
// availability logic until the module is split further.
const placeholderId = "00000000-0000-0000-0000-000000000000";
export const eventRoutes = factory
  .createApp()
  .get("/events", (c) => c.json(ok("Listed events placeholder", [])))
  .get("/events/:slug", (c) => {
    const params = eventSlugParamsSchema.parse(c.req.param());

    return c.json(
      ok("Fetched event placeholder", {
        eventId: placeholderId,
        slug: params.slug,
        name: "placeholder-event",
        description: "placeholder",
        status: "DRAFT" as const,
        openedAt: new Date(0),
        closedAt: null,
        availability: {
          capacity: 0,
          allocated: 0,
          held: 0,
          available: 0,
        },
      }),
    );
  })

  .post(
    "/events",
    requireRole(["ORGANIZER"]),
    zValidator("json", createEventBodySchema),
    async (c) => {
      try {
        const session = c.var.jwtPayload;
        const body = c.req.valid("json");
        const res = await createEvent(db)({
          name: body.name,
          slug: body.slug,
          status: "DRAFT",
          description: body.description,
          organizerId: session.userId,
          openedAt: body.openedAt,
          closedAt: body.closedAt,
        });
        return c.json(
          ok("Successfully created event", {
            eventId: res.id,
            slug: res.slug,
            status: res.status,
          }),
        );
      } catch (e) {
        if (isConstraint(e, CONSTRAINT.UNIQUE_EVENT_SLUG)) {
          return c.json(
            err("Event with slug already exists", "EVENT_SLUG_EXISTS"),
            409,
          );
        }
        throw e;
      }
    },
  )

  .patch(
    "/events/:slug",
    requireRole(["ORGANIZER"]),
    zValidator("param", eventSlugParamsSchema),
    zValidator("json", updateEventBodySchema),
    async (c) => {
      try {
        const params = c.req.valid("param");
        const body = c.req.valid("json");
        const session = c.var.jwtPayload;

        const event = await getEventBySlug(db)(params.slug);
        if (event.organizerId !== session.userId) {
          return c.json(
            err("You are not allowed to perform this action", "FORBIDDEN"),
            403,
          );
        }

        const newOpenedAt =
          body.openedAt !== undefined ? body.openedAt : event.openedAt;
        const newClosedAt =
          body.closedAt !== undefined ? body.closedAt : event.closedAt;

        if (newClosedAt && newClosedAt <= newOpenedAt) {
          return c.json(
            err("Event closed at must be after opened at", "VALIDATION_ERROR"),
            422,
          );
        }

        if (event.status !== "DRAFT") {
          return c.json(err("Event is not editable", "EVENT_NOT_MUTABLE"), 409);
        }

        const res = await updateEvent(db)({
          slug: params.slug,
          description: body.description,
          openedAt: body.openedAt,
          closedAt: body.closedAt,
        });

        return c.json(
          ok("Updated event", {
            eventId: res.id,
            slug: res.slug,
            status: res.status,
          }),
        );
      } catch (e) {
        if (e instanceof NotFoundError) {
          return c.json(err("Event with slug not found", "NOT_FOUND"), 404);
        }
        if (isConstraint(e, CONSTRAINT.UNIQUE_EVENT_SLUG)) {
          return c.json(
            err("Event with slug already exists", "EVENT_SLUG_EXISTS"),
            409,
          );
        }
        throw e;
      }
    },
  )

  .delete("/events/:slug", (c) => {
    const params = eventSlugParamsSchema.parse(c.req.param());

    return c.json(
      ok("Deleted event placeholder", {
        eventId: placeholderId,
        slug: params.slug,
      }),
    );
  })

  .post(
    "/events/:slug/publish",
    requireRole(["ORGANIZER"]),
    zValidator("param", eventSlugParamsSchema),
    async (c) => {
      try {
        const params = c.req.valid("param");
        const event = await getEventBySlug(db)(params.slug);
        const session = c.var.jwtPayload;

        if (event.organizerId !== session.userId) {
          return c.json(
            err("You are not allowed to perform this action", "FORBIDDEN"),
            403,
          );
        }
        if (event.closedAt && isBefore(event.closedAt, new Date())) {
          return c.json(
            err(
              "Event closed at must be after current time, please fix this first",
              "VALIDATION_ERROR",
            ),
            409,
          );
        }
        if (event.closedAt && isBefore(event.closedAt, event.openedAt)) {
          return c.json(
            err(
              "Event closed at must be after opened at, please fix this first",
              "VALIDATION_ERROR",
            ),
            409,
          );
        }
        if (event.status !== "DRAFT") {
          return c.json(err("Event is not editable", "EVENT_NOT_MUTABLE"), 409);
        }
        if (event.capacity === 0) {
          return c.json(
            err("Event doesn't have seat, can't publish", "VALIDATION_ERROR"),
            409,
          );
        }

        await updateEvent(db)({
          slug: params.slug,
          status: "PUBLISHED",
        });

        return c.json(
          ok("Event successfuly published", {
            eventId: event.id,
            slug: params.slug,
            status: "PUBLISHED" as const,
          }),
        );
      } catch (e) {
        if (e instanceof NotFoundError) {
          return c.json(err("Event with slug not found", "NOT_FOUND"), 404);
        }
        throw e;
      }
    },
  )

  .get("/events/:slug/seat-classes", (c) => {
    eventSlugParamsSchema.parse(c.req.param());

    return c.json(ok("Listed seat classes placeholder", []));
  })

  .get("/events/:slug/seat-classes/:seatClassId", (c) => {
    const params = seatClassParamsSchema.parse(c.req.param());

    return c.json(
      ok("Fetched seat class placeholder", {
        seatClassId: params.seatClassId,
        eventId: placeholderId,
        name: "placeholder-seat-class",
        priceIdr: 0,
      }),
    );
  })

  .post(
    "/events/:slug/seat-classes",
    requireRole(["ORGANIZER"]),
    zValidator("param", eventSlugParamsSchema),
    zValidator("json", createSeatClassBodySchema),
    async (c) => {
      try {
        const params = c.req.valid("param");
        const session = c.var.jwtPayload;
        const body = c.req.valid("json");
        const event = await getEventBySlug(db)(params.slug);
        if (event.organizerId !== session.userId) {
          return c.json(
            err("You are not allowed to perform this action", "FORBIDDEN"),
            403,
          );
        }
        if (event.status !== "DRAFT") {
          return c.json(err("Event is not editable", "EVENT_NOT_MUTABLE"), 409);
        }
        const res = await createSeatClass(db)({
          name: body.name,
          slug: body.slug,
          eventId: event.id,
          priceIdr: body.priceIdr,
        });
        return c.json(
          ok("Successfuly created seat class", {
            seatClassId: res.id,
            eventId: res.eventId,
          }),
        );
      } catch (e) {
        if (e instanceof NotFoundError) {
          return c.json(err("Event with slug not found", "NOT_FOUND"), 404);
        }
        if (isConstraint(e, CONSTRAINT.UNIQUE_SEAT_CLASS_SLUG)) {
          return c.json(
            err("Seat class with slug exists", "SEAT_SLUG_EXISTS"),
            409,
          );
        }
        throw e;
      }
    },
  )

  .patch("/events/:slug/seat-classes/:seatClassId", async (c) => {
    const params = seatClassParamsSchema.parse(c.req.param());
    updateSeatClassBodySchema.parse(await c.req.json());

    return c.json(
      ok("Updated seat class placeholder", {
        seatClassId: params.seatClassId,
        eventId: placeholderId,
      }),
    );
  })

  .delete("/events/:slug/seat-classes/:seatClassId", (c) => {
    const params = seatClassParamsSchema.parse(c.req.param());

    return c.json(
      ok("Deleted seat class placeholder", {
        seatClassId: params.seatClassId,
        eventId: placeholderId,
      }),
    );
  })

  .post("/events/:slug/seats", async (c) => {
    eventSlugParamsSchema.parse(c.req.param());
    createSeatsBodySchema.parse(await c.req.json());

    return c.json(
      ok("Created seats placeholder", {
        eventId: placeholderId,
        createdCount: 1,
        seatIds: [placeholderId],
      }),
    );
  })

  .get("/events/:slug/seats", (c) => {
    eventSlugParamsSchema.parse(c.req.param());

    return c.json(ok("Listed seats placeholder", []));
  })

  .get("/events/:slug/seats/:seatId", (c) => {
    const params = seatParamsSchema.parse(c.req.param());

    return c.json(
      ok("Fetched seat placeholder", {
        seatId: params.seatId,
        eventId: placeholderId,
        classId: placeholderId,
        name: "placeholder-seat",
        row: "A",
        column: "1",
      }),
    );
  })

  .post("/events/:slug/reservations", async (c) => {
    eventSlugParamsSchema.parse(c.req.param());
    const body = createEventReservationBodySchema.parse(await c.req.json());

    return c.json(
      ok("Created reservation placeholder", {
        reservationId: placeholderId,
        eventId: placeholderId,
        seatId: body.seatId,
        paymentId: placeholderId,
        status: "PENDING" as const,
        expiredAt: new Date(0),
      }),
    );
  });
