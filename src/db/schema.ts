// Purpose: `src/db/schema.ts` is the initial single-file home for Drizzle table

import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";

export const CONSTRAINT = {
   ACCOUNT_USER: "account_user_id_fkey",
   SESSION_USER: "session_user_id_fkey",
   ORGANIZER_USER: "organizer_user_id_fkey",
   EVENT_ORGANIZER: "event_organizer_id_fkey",
   EVENT_ATTACHMENTS_EVENT: "event_attachments_event_id_fkey",
   EVENT_ATTACHMENTS_ATTACHMENT: "event_attachments_attachment_id_fkey",
   SEAT_CLASS_EVENT: "seat_class_event_id_fkey",
   SEAT_EVENT: "seat_event_id_fkey",
   SEAT_CLASS: "seat_class_id_fkey",
   RESERVATION_USER: "reservation_user_id_fkey",
   RESERVATION_EVENT: "reservation_event_id_fkey",
   RESERVATION_SEAT: "reservation_seat_id_fkey",
   RESERVATION_PAYMENT: "reservation_payment_id_fkey",

   UNIQUE_EMAIL: "unique_email",
   UNIQUE_SEAT_LOCATION: "unique_seat_location",
   UNIQUE_EVENT_SLUG: "unique_event_slug",

   UNIQUE_ACTIVE_SEAT: "unique_active_seat"
} as const;


const priceRecordType = (columnName?: string) => {
   const opt = { mode: "number" } as const;
   if (columnName) return t.bigint(columnName, opt);
   return t.bigint(opt);
};

const timestamps = {
   createdAt: t.timestamp("created_at").defaultNow().notNull(),
   updatedAt: t.timestamp("updated_at").defaultNow().notNull(),
   deletedAt: t.timestamp("deleted_at"),
};

export const attachment = t.pgTable("attachment", {
   id: t.uuid("id").defaultRandom().primaryKey(),
   name: t.text("name").notNull(),
   format: t.text("format").notNull(),
   url: t.text("url").notNull(),
   ...timestamps,
});

export const account = t.pgTable(
   "account",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      emailVerified: t.boolean("email_verified").default(false),
      hashedPassword: t.text("hashed_password").notNull(),
      userId: t.uuid("user_id").notNull(),
      ...timestamps,
   },
   (tbl) => [
      t.foreignKey({
         name: CONSTRAINT.ACCOUNT_USER,
         columns: [tbl.userId],
         foreignColumns: [user.id],
      }).onDelete("cascade"),
   ],
);

export const session = t.pgTable(
   "session",
   {
      token: t.uuid("token").defaultRandom().primaryKey(),
      userId: t.uuid("user_id").notNull(),
      revokedAt: t.timestamp("revoked_at"),
      image: t.text("image"),
      ...timestamps,
   },
   (tbl) => [
      t.index().on(tbl.userId),
      t.foreignKey({
         name: CONSTRAINT.SESSION_USER,
         columns: [tbl.userId],
         foreignColumns: [user.id],
      }).onDelete("cascade"),
   ],
);

export const userRole = t.pgEnum("role", ["ORGANIZER", "ADMIN", "USER"]);

export const user = t.pgTable(
   "user",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      email: t.text("email").notNull(),
      name: t.text("name").notNull(),
      role: userRole().notNull().default("USER"),
   },
   (tbl) => [
      t.unique(CONSTRAINT.UNIQUE_EMAIL).on(tbl.email),
      t.index().on(tbl.email),
   ],
);

export const organizer = t.pgTable(
   "organizer",
   {
      userId: t.uuid("user_id").primaryKey(),
      organizerName: t.text("organizer_name").notNull(),
      // TODO: add other organizer profile related fields
   },
   (tbl) => [
      t.index().on(tbl.userId),
      t.foreignKey({
         name: CONSTRAINT.ORGANIZER_USER,
         columns: [tbl.userId],
         foreignColumns: [user.id],
      }).onDelete("cascade"),
   ],
);

export const paymentStatus = t.pgEnum("payment_status", [
   "PENDING",
   "PAID",
   "FAILED",
   "REFUNDED",
]);

export const payment = t.pgTable("payment", {
   id: t.uuid("id").defaultRandom().primaryKey(),
   amountIdr: priceRecordType("amount_idr").notNull(),
   status: paymentStatus(),
   ...timestamps,
});

export const eventStatus = t.pgEnum("event_status", ["DRAFT", "PUBLISHED"]);

export const event = t.pgTable(
   "event",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      organizerId: t.uuid("organizer_id").notNull(),
      status: eventStatus().default("DRAFT").notNull(),
      slug: t.text("slug").notNull(),
      name: t.text("name").notNull(),
      description: t.text("description").notNull(),
      openedAt: t.timestamp("opened_at").notNull(),
      closedAt: t.timestamp("closed_at"),
      ...timestamps,
   },
   (tbl) => [
      t.index().on(tbl.name),
      t.index().on(tbl.slug),
      t.unique(CONSTRAINT.UNIQUE_EVENT_SLUG).on(tbl.slug),
      t.foreignKey({
         name: CONSTRAINT.EVENT_ORGANIZER,
         columns: [tbl.organizerId],
         foreignColumns: [organizer.userId],
      }).onDelete("cascade"),
   ],
);

export const eventAttachments = t.pgTable(
   "event_attachments",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      eventId: t.uuid("event_id").notNull(),
      attachmentId: t.uuid("attachment_id").notNull(),
   },
   (tbl) => [
      t.index().on(tbl.eventId),
      t.index().on(tbl.attachmentId),
      t.foreignKey({
         name: CONSTRAINT.EVENT_ATTACHMENTS_EVENT,
         columns: [tbl.eventId],
         foreignColumns: [event.id],
      }).onDelete("cascade"),
      t.foreignKey({
         name: CONSTRAINT.EVENT_ATTACHMENTS_ATTACHMENT,
         columns: [tbl.attachmentId],
         foreignColumns: [attachment.id],
      }).onDelete("cascade"),
   ],
);

export const seatClass = t.pgTable(
   "seat_class",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      name: t.text("name").notNull(),
      priceIdr: priceRecordType("price_idr").notNull(),
      eventId: t.uuid("event_id").notNull(),
      ...timestamps,
   },
   (tbl) => [
      t.index().on(tbl.name),
      t.index().on(tbl.eventId),
      t.foreignKey({
         name: CONSTRAINT.SEAT_CLASS_EVENT,
         columns: [tbl.eventId],
         foreignColumns: [event.id],
      }).onDelete("cascade"),
   ],
);

export const seat = t.pgTable(
   "seat",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      name: t.text("name").notNull(),
      row: t.text("row").notNull(),
      column: t.text("column").notNull(),
      eventId: t.uuid("event_id").notNull(),
      classId: t.uuid("class_id").notNull(),
      ...timestamps,
   },
   (tbl) => [
      t.unique(CONSTRAINT.UNIQUE_SEAT_LOCATION).on(tbl.row, tbl.column, tbl.eventId),
      t.index().on(tbl.name),
      t.index().on(tbl.eventId),
      t.foreignKey({
         name: CONSTRAINT.SEAT_EVENT,
         columns: [tbl.eventId],
         foreignColumns: [event.id],
      }).onDelete("cascade"),
      t.foreignKey({
         name: CONSTRAINT.SEAT_CLASS,
         columns: [tbl.classId],
         foreignColumns: [seatClass.id],
      }).onDelete("cascade"),
   ],
);

export const reservationStatus = t.pgEnum("reservation_status", [
   "PENDING",
   "RESERVED",
   "CANCELED",
]);

export const reservation = t.pgTable(
   "reservation",
   {
      id: t.uuid("id").defaultRandom().primaryKey(),
      status: reservationStatus().default("PENDING").notNull(),
      idUser: t.uuid("user_id").notNull(),
      idEvent: t.uuid("event_id").notNull(),
      idSeat: t.uuid("seat_id").notNull(),
      idPayment: t.uuid("payment_id").notNull(),
      expiredAt: t.timestamp("expired_at"),
      ...timestamps,
   },
   (tbl) => [
      t
         .uniqueIndex(CONSTRAINT.UNIQUE_ACTIVE_SEAT)
         .on(tbl.idEvent, tbl.idSeat)
         .where(sql`${tbl.status} IN ('PENDING', 'RESERVED')`),
      t.foreignKey({
         name: CONSTRAINT.RESERVATION_USER,
         columns: [tbl.idUser],
         foreignColumns: [user.id],
      }),
      t.foreignKey({
         name: CONSTRAINT.RESERVATION_EVENT,
         columns: [tbl.idEvent],
         foreignColumns: [event.id],
      }),
      t.foreignKey({
         name: CONSTRAINT.RESERVATION_SEAT,
         columns: [tbl.idSeat],
         foreignColumns: [seat.id],
      }),
      t.foreignKey({
         name: CONSTRAINT.RESERVATION_PAYMENT,
         columns: [tbl.idPayment],
         foreignColumns: [payment.id],
      }),
   ],
);



export {};
