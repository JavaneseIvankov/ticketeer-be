import Pino from "pino";
import { env } from "@/config/env";

const opts = {
  colorize: true,
  translateTime: "SYS:standard",
  ignore: "pid,hostname",
  levelFirst: true,
};

export const rootLogger = Pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: opts,
        }
      : undefined,
});
