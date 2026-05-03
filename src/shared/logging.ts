import Pino from "pino";
import { env } from "@/config/env";

export const rootLogger = Pino({
  level: env.LOG_LEVEL,
});
