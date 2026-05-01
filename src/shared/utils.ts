// Purpose: `src/shared/utils.ts` contains cross-cutting utility helpers that do
// not belong to a single business domain.

import type { Logger } from "pino";

export const withSpan =
  (deps: { logger: Logger }) =>
  async <T>(fn: () => Promise<T>, label: string) => {
    const start = performance.now();
    deps.logger.debug({ label }, "span start");
    try {
      const res = await fn();
      const duration = performance.now() - start;
      deps.logger.debug({ label, duration: duration.toFixed(2) }, "span end");
      return res;
    } catch (error) {
      const duration = performance.now() - start;
      deps.logger.debug(
        { label, duration: duration.toFixed(2), error },
        "span error",
      );
      throw error; // Re-throw so tryCatch can handle it
    }
  };

type TryCatchProps<T, E = unknown> = {
  fn: () => Promise<T>;
  onError?: (error: unknown) => void;
  mapError?: (error: unknown) => E;
};

type TryCatch = <T, E = unknown>(props: TryCatchProps<T, E>) => Promise<T | E>;

export const tryCatch: TryCatch = async <T, E = never>({
  fn,
  onError,
  mapError,
}: TryCatchProps<T, E>): Promise<T | E> => {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);

    if (mapError) {
      return mapError(error);
    }

    throw error; // or return error as E if you prefer
  }
};
