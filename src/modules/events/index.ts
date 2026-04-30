import { Hono } from "hono";

// Purpose: `src/modules/events/index.ts` is the collapsed entrypoint for the
// events domain. It groups event CRUD, publish rules, seat classes, seats, and
// availability logic until the module is split further.
export const eventRoutes = new Hono();

eventRoutes.get("/events", (c) =>
  c.json({
    status: "success",
    message: "Events module placeholder",
    data: []
  })
);
