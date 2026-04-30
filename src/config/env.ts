import "dotenv/config";

import { z } from "zod";

// Purpose: `src/config/env.ts` owns runtime environment parsing and validation
// so the rest of the application reads typed config instead of raw `process.env`.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000)
});

export const env = envSchema.parse(process.env);
