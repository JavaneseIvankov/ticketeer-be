import "dotenv/config";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { event, payment, reservation, seat } from "@/db/schema";

const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const expectedDatabaseName = "ticketeer";
const resetFlag = "ALLOW_E2E_DB_RESET";

// TODO: make it dynamically generated from schema or drizzle instance
const appTables = [
  "reservation",
  "payment",
  "seat",
  "seat_class",
  "event",
  "organizer",
  "account",
  "session",
  '"user"',
] as const;

let pool: Pool | undefined;

const getE2eDb = () => drizzle(getE2ePool());

export const isE2eDbResetEnabled = () => process.env[resetFlag] === "true";

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for e2e preparation");
  }
  return databaseUrl;
};

export const assertSafeE2eDatabase = () => {
  const databaseUrl = getDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");

  if (!allowedHosts.has(parsed.hostname)) {
    throw new Error(
      `Refusing e2e DB reset for non-local host "${parsed.hostname}"`,
    );
  }

  if (databaseName !== expectedDatabaseName) {
    throw new Error(
      `Refusing e2e DB reset for database "${databaseName}", expected "${expectedDatabaseName}"`,
    );
  }

  if (!isE2eDbResetEnabled()) {
    throw new Error(`Refusing e2e DB reset without ${resetFlag}=true`);
  }
};

export const assertE2eDbResetEnabled = () => {
  if (!isE2eDbResetEnabled()) {
    throw new Error(
      `This e2e suite requires ${resetFlag}=true so tests can reset the local database safely`,
    );
  }
};

export const getE2ePool = () => {
  assertSafeE2eDatabase();

  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return pool;
};

export const truncateAllTables = async () => {
  const tableList = appTables.join(", ");
  await getE2eDb().execute(
    sql`TRUNCATE TABLE ${sql.raw(tableList)} RESTART IDENTITY CASCADE`,
  );
};

export const setReservationExpiredAt = async (
  reservationId: string,
  expiredAt: Date,
) => {
  await getE2eDb()
    .update(reservation)
    .set({ expiredAt })
    .where(eq(reservation.id, reservationId));
};

export const setEventCapacity = async (eventId: string, capacity: number) => {
  await getE2eDb().update(event).set({ capacity }).where(eq(event.id, eventId));
};

export const insertSeat = async (input: {
  eventId: string;
  classId: string;
  name?: string;
  row?: string;
  column?: string;
}) => {
  const name = input.name ?? "A-1";
  const row = input.row ?? "A";
  const column = input.column ?? "1";

  const result = await getE2eDb()
    .insert(seat)
    .values({
      name,
      row,
      column,
      eventId: input.eventId,
      classId: input.classId,
    })
    .returning({ id: seat.id });

  return result[0].id;
};

export const insertPayment = async (input?: {
  paymentId?: string;
  amountIdr?: number;
  status?: "PENDING" | "PAID" | "FAILED";
}) => {
  const paymentId = input?.paymentId ?? crypto.randomUUID();
  const amountIdr = input?.amountIdr ?? 100_000;
  const status = input?.status ?? "PENDING";

  const result = await getE2eDb()
    .insert(payment)
    .values({
      id: paymentId,
      amountIdr,
      status,
    })
    .returning({ id: payment.id });

  return result[0].id;
};

export const insertReservation = async (input: {
  reservationId?: string;
  userId: string;
  eventId: string;
  seatId: string;
  paymentId: string;
  status?: "PENDING" | "RESERVED" | "CANCELED";
  expiredAt?: Date | null;
}) => {
  const reservationId = input.reservationId ?? crypto.randomUUID();
  const status = input.status ?? "PENDING";
  const expiredAt = input.expiredAt ?? new Date(Date.now() + 5 * 60 * 1000);

  const result = await getE2eDb()
    .insert(reservation)
    .values({
      id: reservationId,
      idUser: input.userId,
      idEvent: input.eventId,
      idSeat: input.seatId,
      idPayment: input.paymentId,
      status,
      expiredAt,
    })
    .returning({ id: reservation.id });

  return result[0].id;
};

export const closeE2ePool = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
};
