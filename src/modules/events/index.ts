import { factory } from "@/config/app";
import { db } from "@/db/client";
import { CONSTRAINT } from "@/db/schema";
import { isConstraint, NotFoundError } from "@/db/utils";
import { requireRole } from "@/shared/auth";
import { err, ok } from "@/shared/http";
import { isBefore } from "@/shared/utils";
import { zValidator } from "@/shared/validation";
import { createEvent, getEventBySlug, updateEvent } from "./operations";
import {
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
export const eventRoutes = factory.createApp();

eventRoutes.get("/events", (c) => c.json(ok("Listed events placeholder", [])));

eventRoutes.get("/events/:slug", (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());

  return c.json(ok("Fetched event placeholder", { slug: params.slug }));
});

eventRoutes.post(
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
      return c.json(ok("Successfully created event", { slug: res.slug }));
    } catch (e) {
      if (isConstraint(e, CONSTRAINT.UNIQUE_EVENT_SLUG)) {
        return c.json(
          err("Event with slug already exists", "EVENT_SLUG_EXISTS"),
        );
      }
      throw e;
    }
  },
);

eventRoutes.patch(
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

      // TODO: extract logic into separate function
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

      return c.json(ok("Updated event", { slug: res.slug }));
    } catch (e) {
      if (e instanceof NotFoundError) {
        return c.json(err("Event with slug not found", "EVENT_NOT_FOUND"), 404);
      }
      if (isConstraint(e, CONSTRAINT.UNIQUE_EVENT_SLUG)) {
        return c.json(
          err("Event with slug already exists", "EVENT_SLUG_EXISTS"),
        );
      }
    }
  },
);

eventRoutes.delete("/events/:slug", (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());

  return c.json(ok("Deleted event placeholder", { slug: params.slug }));
});

eventRoutes.post(
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

      if (isBefore(event.closedAt, new Date())) {
        return c.json(
          err(
            "Event closed at must be after current time, please fix this first",
            "VALIDATION_ERROR",
          ),
          409,
        );
      }

      // TODO: extract logic into separate predicate function
      if (isBefore(event.closedAt, event.openedAt)) {
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
        // we use capacity as a proxy for the number of seats and seat classes, so capacity update logic must work.
        return c.json(
          err("Event doesn't have seat, can't publish", "VALIDATION_ERROR"),
          409,
        );
      }

      const _ = await updateEvent(db)({
        slug: params.slug,
        status: "PUBLISHED",
      });

      return c.json(ok("Event successfuly published", { slug: params.slug }));
    } catch (e) {
      if (e instanceof NotFoundError) {
        return c.json(err("Event with slug not found", "EVENT_NOT_FOUND"), 404);
      }
      throw e;
    }
  },
);

eventRoutes.get("/events/:slug/seat-classes", (c) => {
  eventSlugParamsSchema.parse(c.req.param());

  return c.json(ok("Listed seat classes placeholder", []));
});

eventRoutes.get("/events/:slug/seat-classes/:seatClassId", (c) => {
  const params = seatClassParamsSchema.parse(c.req.param());

  return c.json(
    ok("Fetched seat class placeholder", {
      slug: params.slug,
      seatClassId: params.seatClassId,
    }),
  );
});

eventRoutes.post("/events/:slug/seat-classes", async (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());
  createSeatClassBodySchema.parse(await c.req.json());

  return c.json(ok("Created seat class placeholder", { slug: params.slug }));
});

eventRoutes.patch("/events/:slug/seat-classes/:seatClassId", async (c) => {
  const params = seatClassParamsSchema.parse(c.req.param());
  updateSeatClassBodySchema.parse(await c.req.json());

  return c.json(
    ok("Updated seat class placeholder", {
      slug: params.slug,
      seatClassId: params.seatClassId,
    }),
  );
});

eventRoutes.delete("/events/:slug/seat-classes/:seatClassId", (c) => {
  const params = seatClassParamsSchema.parse(c.req.param());

  return c.json(
    ok("Deleted seat class placeholder", {
      slug: params.slug,
      seatClassId: params.seatClassId,
    }),
  );
});

eventRoutes.post("/events/:slug/seats", async (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());
  createSeatsBodySchema.parse(await c.req.json());

  return c.json(ok("Created seats placeholder", { slug: params.slug }));
});

eventRoutes.get("/events/:slug/seats", (c) => {
  eventSlugParamsSchema.parse(c.req.param());

  return c.json(ok("Listed seats placeholder", []));
});

eventRoutes.get("/events/:slug/seats/:seatId", (c) => {
  const params = seatParamsSchema.parse(c.req.param());

  return c.json(
    ok("Fetched seat placeholder", {
      slug: params.slug,
      seatId: params.seatId,
    }),
  );
});

eventRoutes.post("/events/:slug/reservations", async (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());
  const body = createEventReservationBodySchema.parse(await c.req.json());

  return c.json(
    ok("Created reservation placeholder", {
      slug: params.slug,
      seatId: body.seatId,
    }),
  );
});
