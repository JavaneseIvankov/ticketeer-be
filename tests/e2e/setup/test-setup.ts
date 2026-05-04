import { afterAll, beforeEach } from "vitest";
import {
  closeE2ePool,
  isE2eDbResetEnabled,
  truncateAllTables,
} from "../utils/db";

beforeEach(async () => {
  if (!isE2eDbResetEnabled()) {
    return;
  }

  await truncateAllTables();
});

afterAll(async () => {
  await closeE2ePool();
});
