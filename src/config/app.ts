import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { err } from "@/shared/http";
import { rootLogger } from "@/shared/logging";
import { formatValidationErrors, ValidationError } from "@/shared/validation";

const logger = rootLogger;

export const factory = createFactory({
  initApp: (app) => {
    app.onError((error, c) => {
      if (error instanceof ValidationError) {
        const detail = formatValidationErrors(error.issues);

        return c.json(
          err("Validation failed", "VALIDATION_ERROR", {
            code: "VALIDATION_ERROR",
            detail,
          }),
          422,
        );
      }

      if (error instanceof HTTPException) {
        return error.getResponse();
      }

      logger.error({ err: error }, "uncaught error");
      return c.json(err("Internal server error", "INTERNAL_ERROR"), 500);
    });
  },
});
