import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { ErrorResponse } from "@/shared/http";
import { rootLogger } from "@/shared/logging";
import { formatValidationErrors, ValidationError } from "@/shared/validation";

const logger = rootLogger;

export const factory = createFactory({
  initApp: (app) => {
    app.onError((err, c) => {
      logger.error({ error: err }, "app error");
      if (err instanceof ValidationError) {
        const detail = formatValidationErrors(err.issues);

        return c.json(
          {
            status: "error",
            message: "Invalid request body",
            error: {
              code: "INVALID_REQUEST_BODY",
              detail,
            },
          } satisfies ErrorResponse<"INVALID_REQUEST_BODY">,
          422,
        );
      }

      if (err instanceof HTTPException) {
        return err.getResponse();
      }

      logger.fatal({ error: err }, "uncaught error");
      return c.json(
        {
          status: "error",
          message: "Internal server error",
          error: "INTERNAL_SERVER_ERROR",
        },
        500,
      );
    });
  },
});
