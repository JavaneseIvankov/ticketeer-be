import { execFile } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { assertSafeE2eDatabase, closeE2ePool, getE2ePool } from "./db";

const execFileAsync = promisify(execFile);
const currentDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDir, "../../..");

export const prepareE2eEnvironment = async () => {
  assertSafeE2eDatabase();

  await execFileAsync("pnpm", ["exec", "drizzle-kit", "push", "--force"], {
    cwd: projectRoot,
    env: process.env,
  });

  const pool = getE2ePool();
  await pool.query("select 1");
};

export const finalizeE2ePreparation = async () => {
  await closeE2ePool();
};
