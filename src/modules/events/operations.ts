import { eq, sql } from "drizzle-orm";
import type { DbOrTx } from "@/db/client";
import { event, seatClass } from "@/db/schema";
import { dbOperation as makeDbOperation, NotFoundError } from "@/db/utils";
import { rootLogger } from "@/shared/logging";

const logger = rootLogger.child({ module: "events/operations" });
const dbOperation = makeDbOperation({ logger });

type BaseEventInsert = Omit<typeof event.$inferInsert, "id">;
type EventInsertPayload = Omit<BaseEventInsert, "openedAt" | "closedAt"> & {
  openedAt: Date;
  closedAt?: Date | null;
};

const toEventInsertValues = (payload: EventInsertPayload) => {
  const { closedAt, ...rest } = payload;

  if (closedAt === null) {
    return {
      ...rest,
      closedAt: sql`null`,
    };
  }

  return {
    ...rest,
    closedAt: closedAt ?? sql`null`,
  };
};

export const createEvent =
  (db: DbOrTx) => async (payload: EventInsertPayload) => {
    return dbOperation({ label: "createEvent", args: payload }, async () => {
      const res = await db
        .insert(event)
        .values(toEventInsertValues(payload))
        .returning()
        .execute();
      if (res.length === 0) {
        throw new NotFoundError(`Event with slug ${payload.slug} not found`);
      }
      return res[0];
    });
  };

type BaseEventUpdate = Partial<Omit<EventInsertPayload, "slug">> & {
  slug: string;
};

const toEventUpdateValues = (payload: BaseEventUpdate) => {
  const { closedAt, ...rest } = payload;

  if (closedAt === undefined) {
    return rest;
  }

  if (closedAt === null) {
    return {
      ...rest,
      closedAt: sql`null`,
    };
  }

  return {
    ...rest,
    closedAt,
  };
};

export const updateEvent = (db: DbOrTx) => async (payload: BaseEventUpdate) => {
  return dbOperation({ label: "updateEvent", args: payload }, async () => {
    const res = await db
      .update(event)
      .set(toEventUpdateValues(payload))
      .where(eq(event.slug, payload.slug))
      .returning()
      .execute();
    if (res.length === 0) {
      throw new NotFoundError(`Event with slug ${payload.slug} not found`);
    }
    return res[0];
  });
};

export const getEventBySlug = (db: DbOrTx) => async (slug: string) => {
  return dbOperation({ label: "getEventBySlug", args: { slug } }, async () => {
    const res = await db
      .select()
      .from(event)
      .where(eq(event.slug, slug))
      .execute();
    if (res.length === 0) {
      throw new NotFoundError(`Event with slug ${slug} not found`);
    }
    return res[0];
  });
};

type BaseSeatClassInsert = typeof seatClass.$inferInsert;
export const createSeatClass =
  (db: DbOrTx) => async (payload: BaseSeatClassInsert) => {
    return dbOperation(
      { label: "createSeatClass", args: payload },
      async () => {
        const res = await db
          .insert(seatClass)
          .values(payload)
          .returning()
          .execute();
        return res[0];
      },
    );
  };
