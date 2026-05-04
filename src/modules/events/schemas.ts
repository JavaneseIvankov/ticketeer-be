import { z } from "zod";
import { isoDatetimeStringSchema, slugSchema, uuidSchema } from "@/shared/http";

export const nonEmptyStringSchema = z.string().min(1);

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
    closedAt: isoDatetimeStringSchema,
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
    closedAt: isoDatetimeStringSchema,
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
