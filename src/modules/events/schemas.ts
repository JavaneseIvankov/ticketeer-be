import { z } from "zod";
import {
  dateSchema,
  dateValueSchema,
  nullableDateSchema,
  nullableDateValueSchema,
  slugSchema,
  successEnvelopeSchema as success,
  uuidSchema,
} from "@/shared/http";

export const nonEmptyStringSchema = z.string().min(1);
export const eventStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export const reservationStatusSchema = z.enum([
  "PENDING",
  "RESERVED",
  "CANCELED",
]);

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
    openedAt: dateSchema,
    closedAt: nullableDateSchema,
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
    openedAt: dateSchema,
    closedAt: nullableDateSchema,
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

export const eventAvailabilityDataSchema = z.object({
  capacity: z.int().min(0),
  allocated: z.int().min(0),
  held: z.int().min(0),
  available: z.int().min(0),
});

export const listEventsResponseDataSchema = z.array(
  z.object({
    eventId: uuidSchema,
    slug: slugSchema,
    name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    status: eventStatusSchema,
    openedAt: dateValueSchema,
    closedAt: nullableDateValueSchema,
    availability: eventAvailabilityDataSchema,
  }),
);

export const getEventResponseDataSchema = z.object({
  eventId: uuidSchema,
  slug: slugSchema,
  name: nonEmptyStringSchema,
  description: nonEmptyStringSchema,
  status: eventStatusSchema,
  openedAt: dateValueSchema,
  closedAt: nullableDateValueSchema,
  availability: eventAvailabilityDataSchema,
});

export const createEventResponseDataSchema = z.object({
  eventId: uuidSchema,
  slug: slugSchema,
  status: eventStatusSchema,
});

export const updateEventResponseDataSchema = createEventResponseDataSchema;
export const deleteEventResponseDataSchema = z.object({
  eventId: uuidSchema,
  slug: slugSchema,
});
export const publishEventResponseDataSchema = createEventResponseDataSchema;

export const listSeatClassesResponseDataSchema = z.array(
  z.object({
    seatClassId: uuidSchema,
    eventId: uuidSchema,
    name: nonEmptyStringSchema,
    priceIdr: z.int().min(0),
  }),
);

export const getSeatClassResponseDataSchema = z.object({
  seatClassId: uuidSchema,
  eventId: uuidSchema,
  name: nonEmptyStringSchema,
  priceIdr: z.int().min(0),
});

export const createSeatClassResponseDataSchema = z.object({
  seatClassId: uuidSchema,
  eventId: uuidSchema,
});

export const updateSeatClassResponseDataSchema =
  createSeatClassResponseDataSchema;
export const deleteSeatClassResponseDataSchema =
  createSeatClassResponseDataSchema;

export const listSeatsResponseDataSchema = z.array(
  z.object({
    seatId: uuidSchema,
    eventId: uuidSchema,
    classId: uuidSchema,
    name: nonEmptyStringSchema,
    row: nonEmptyStringSchema,
    column: nonEmptyStringSchema,
  }),
);

export const getSeatResponseDataSchema = z.object({
  seatId: uuidSchema,
  eventId: uuidSchema,
  classId: uuidSchema,
  name: nonEmptyStringSchema,
  row: nonEmptyStringSchema,
  column: nonEmptyStringSchema,
});

export const createSeatsResponseDataSchema = z.object({
  eventId: uuidSchema,
  createdCount: z.int().min(1),
  seatIds: z.array(uuidSchema).min(1),
});

export const createEventReservationResponseDataSchema = z.object({
  reservationId: uuidSchema,
  eventId: uuidSchema,
  seatId: uuidSchema,
  paymentId: uuidSchema,
  status: reservationStatusSchema,
  expiredAt: dateValueSchema,
});

export const listEventsResponseSchema = success(listEventsResponseDataSchema);
export const getEventResponseSchema = success(getEventResponseDataSchema);
export const createEventResponseSchema = success(createEventResponseDataSchema);
export const updateEventResponseSchema = success(updateEventResponseDataSchema);
export const deleteEventResponseSchema = success(deleteEventResponseDataSchema);
export const publishEventResponseSchema = success(
  publishEventResponseDataSchema,
);
export const listSeatClassesResponseSchema = success(
  listSeatClassesResponseDataSchema,
);
export const getSeatClassResponseSchema = success(
  getSeatClassResponseDataSchema,
);
export const createSeatClassResponseSchema = success(
  createSeatClassResponseDataSchema,
);
export const updateSeatClassResponseSchema = success(
  updateSeatClassResponseDataSchema,
);
export const deleteSeatClassResponseSchema = success(
  deleteSeatClassResponseDataSchema,
);
export const listSeatsResponseSchema = success(listSeatsResponseDataSchema);
export const getSeatResponseSchema = success(getSeatResponseDataSchema);
export const createSeatsResponseSchema = success(createSeatsResponseDataSchema);
export const createEventReservationResponseSchema = success(
  createEventReservationResponseDataSchema,
);

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
export type ListEventsResponseData = z.infer<
  typeof listEventsResponseDataSchema
>;
export type GetEventResponseData = z.infer<typeof getEventResponseDataSchema>;
export type CreateEventResponseData = z.infer<
  typeof createEventResponseDataSchema
>;
export type UpdateEventResponseData = z.infer<
  typeof updateEventResponseDataSchema
>;
export type DeleteEventResponseData = z.infer<
  typeof deleteEventResponseDataSchema
>;
export type PublishEventResponseData = z.infer<
  typeof publishEventResponseDataSchema
>;
export type ListSeatClassesResponseData = z.infer<
  typeof listSeatClassesResponseDataSchema
>;
export type GetSeatClassResponseData = z.infer<
  typeof getSeatClassResponseDataSchema
>;
export type CreateSeatClassResponseData = z.infer<
  typeof createSeatClassResponseDataSchema
>;
export type UpdateSeatClassResponseData = z.infer<
  typeof updateSeatClassResponseDataSchema
>;
export type DeleteSeatClassResponseData = z.infer<
  typeof deleteSeatClassResponseDataSchema
>;
export type ListSeatsResponseData = z.infer<typeof listSeatsResponseDataSchema>;
export type GetSeatResponseData = z.infer<typeof getSeatResponseDataSchema>;
export type CreateSeatsResponseData = z.infer<
  typeof createSeatsResponseDataSchema
>;
export type CreateEventReservationResponseData = z.infer<
  typeof createEventReservationResponseDataSchema
>;
