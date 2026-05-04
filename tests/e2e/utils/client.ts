import { testClient } from "hono/testing";
import { type AppType, app } from "@/app";

export const createE2eClient = () => testClient<AppType>(app);
export const e2eClient = createE2eClient();
export type E2eClient = typeof e2eClient;
