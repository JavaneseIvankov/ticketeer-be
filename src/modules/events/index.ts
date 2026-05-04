import { z } from "zod";
import { factory } from "@/config/app";
import { db } from "@/db/client";
import { CONSTRAINT } from "@/db/schema";
import { isConstraint, NotFoundError } from "@/db/utils";
import { requireRole } from "@/shared/auth";
import {
  err,
  isoDatetimeStringSchema,
  nullableIsoDatetimeStringSchema,
  ok,
  slugSchema,
  uuidSchema,
} from "@/shared/http";
import { zValidator } from "@/shared/validation";
import { createEvent, getEventBySlug, updateEvent } from "./operations";

// Purpose: `src/modules/events/index.ts` is the collapsed entrypoint for the
// events domain. It groups event CRUD, publish rules, seat classes, seats, and
// availability logic until the module is split further.
export const eventRoutes = factory.createApp();

const nonEmptyStringSchema = z.string().min(1);

export const eventSlugParamsSchema = z.object({ slug: slugSchema });
export const seatClassParamsSchema = z.object({
  slug: slugSchema,
  seatClassId: uuidSchema,
});
export const seatParamsSchema = z.object({
  slug: slugSchema,
  seatId: uuidSchema,
});

export const createEventBodySchema = z
  .object({
    slug: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    openedAt: isoDatetimeStringSchema,
    closedAt: nullableIsoDatetimeStringSchema,
  })
  .refine((data) => !data.closedAt || data.closedAt > data.openedAt, {
    message: "Closed at must be after opened at",
    path: ["closedAt"],
  });

export const updateEventBodySchema = z
  .object({
    slug: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    openedAt: isoDatetimeStringSchema,
    closedAt: nullableIsoDatetimeStringSchema,
  })
  .partial();

// export const updateEventBodySchema = createEventBodySchema;

export const createSeatClassBodySchema = z.object({
  name: nonEmptyStringSchema,
  priceIdr: z.int().min(0),
});

export const updateSeatClassBodySchema = createSeatClassBodySchema;

export const createSeatsBodySchema = z.object({
  seats: z
    .array(
      z.object({
        name: nonEmptyStringSchema,
        row: nonEmptyStringSchema,
        column: nonEmptyStringSchema,
        classId: uuidSchema,
      }),
    )
    .min(1),
});

export const createEventReservationBodySchema = z.object({
  seatId: uuidSchema,
});

export type EventSlugParams = z.infer<typeof eventSlugParamsSchema>;
export type SeatClassParams = z.infer<typeof seatClassParamsSchema>;
export type SeatParams = z.infer<typeof seatParamsSchema>;
export type CreateEventBody = z.infer<typeof createEventBodySchema>;
export type UpdateEventBody = z.infer<typeof updateEventBodySchema>;
export type CreateSeatClassBody = z.infer<typeof createSeatClassBodySchema>;
export type UpdateSeatClassBody = z.infer<typeof updateSeatClassBodySchema>;
export type CreateSeatsBody = z.infer<typeof createSeatsBodySchema>;
export type CreateEventReservationBody = z.infer<
  typeof createEventReservationBodySchema
>;

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

eventRoutes.post("/events/:slug/publish", (c) => {
  const params = eventSlugParamsSchema.parse(c.req.param());

  return c.json(ok("Published event placeholder", { slug: params.slug }));
});

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
