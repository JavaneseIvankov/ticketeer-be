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
