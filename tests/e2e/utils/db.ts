import "dotenv/config";

import { Pool } from "pg";

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
  const client = getE2ePool();
  const tableList = appTables.join(", ");
  await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
};

export const closeE2ePool = async () => {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
};
