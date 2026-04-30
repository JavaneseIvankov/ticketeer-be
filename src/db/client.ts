import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { Pool } from "pg";

import { env } from "@/config/env";

export type DbOrTx = NodePgDatabase<Record<string, never>> & {
  $client: Pool;
}
  | PgTransaction<any, any, any>;

// Purpose: `src/db/client.ts` provides the shared Drizzle client and transaction
// compatible types that repositories and services will use.
export const db = drizzle(env.DATABASE_URL);
