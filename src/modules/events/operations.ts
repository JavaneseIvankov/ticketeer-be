import { eq } from "drizzle-orm";
import type { DbOrTx } from "@/db/client";
import { event } from "@/db/schema";
import { dbOperation as makeDbOperation, NotFoundError } from "@/db/utils";
import { rootLogger } from "@/shared/logging";

const logger = rootLogger.child({ module: "events/operations" });
const dbOperation = makeDbOperation({ logger });

type BaseEventInsert = Omit<typeof event.$inferInsert, "id">;
export const createEvent = (db: DbOrTx) => async (payload: BaseEventInsert) => {
  return dbOperation({ label: "createEvent", args: payload }, async () => {
    const res = await db.insert(event).values(payload).returning().execute();
    if (res.length === 0) {
      throw new NotFoundError(`Event with slug ${payload.slug} not found`);
    }
    return res[0];
  });
};

type BaseEventUpdate = Partial<BaseEventInsert> & { slug: string };
export const updateEvent = (db: DbOrTx) => async (payload: BaseEventUpdate) => {
  return dbOperation({ label: "updateEvent", args: payload }, async () => {
    const res = await db
      .update(event)
      .set(payload)
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
