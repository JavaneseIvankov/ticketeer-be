import { eq } from "drizzle-orm";
import type { DbOrTx } from "@/db/client";
import { account, organizer, user } from "@/db/schema";
import { dbOperation as makeDbOperation, NotFoundError } from "@/db/utils";
import { rootLogger } from "@/shared/logging";

const logger = rootLogger.child({ module: "auth/operations" });
const dbOperation = makeDbOperation({ logger });

export const getUserById = (db: DbOrTx) => async (id: string) => {
  return dbOperation({ label: "getUserById", args: { id } }, async () => {
    const res = await db.select().from(user).where(eq(user.id, id));
    if (res.length === 0) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return res[0];
  });
};

export const getUserByEmail = (db: DbOrTx) => async (email: string) => {
  return dbOperation({ label: "getUserByEmail", args: { email } }, async () => {
    const res = await db.select().from(user).where(eq(user.email, email));
    if (res.length === 0) {
      throw new NotFoundError(`User with email ${email} not found`);
    }
    return res[0];
  });
};

export type BaseUserInsert = typeof user.$inferInsert;
export const createUser = (db: DbOrTx) => async (payload: BaseUserInsert) => {
  return dbOperation({ label: "createUser", args: payload }, async () => {
    const res = await db.insert(user).values(payload).returning().execute();
    return res[0];
  });
};

export const getAccountByUserId = (db: DbOrTx) => async (userId: string) => {
  return dbOperation(
    { label: "getAccountByUserId", args: { userId } },
    async () => {
      const res = await db
        .select()
        .from(account)
        .where(eq(account.userId, userId));
      if (res.length === 0) {
        throw new NotFoundError(`Account with userId ${userId} not found`);
      }
      return res[0];
    },
  );
};

type BaseAccountInsert = typeof account.$inferInsert;
export const createAccount =
  (db: DbOrTx) => async (payload: BaseAccountInsert) => {
    return dbOperation({ label: "createAccount", args: payload }, async () => {
      const res = await db
        .insert(account)
        .values(payload)
        .returning()
        .execute();
      return res[0];
    });
  };

type BaseOrganizerInsert = typeof organizer.$inferInsert;
export const createOrganizer =
  (db: DbOrTx) => async (payload: BaseOrganizerInsert) => {
    return dbOperation(
      { label: "createOrganizer", args: payload },
      async () => {
        const res = await db
          .insert(organizer)
          .values(payload)
          .returning()
          .execute();
        return res[0];
      },
    );
  };
