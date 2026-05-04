import { z } from "zod";
import { errorCodeSchema, errorEnvelopeSchema } from "@/shared/http";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

const reviveJsonDates = (value: unknown): unknown => {
  if (typeof value === "string") {
    return isoDateTimeSchema.safeParse(value).success ? new Date(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => reviveJsonDates(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        reviveJsonDates(entry),
      ]),
    );
  }

  return value;
};

export const parseJson = async <TSchema extends z.ZodTypeAny>(
  response: Response,
  schema: TSchema,
) => {
  const json = await response.json();
  return schema.parse(reviveJsonDates(json));
};

export const parseErrorJson = async (response: Response) => {
  const json = await response.json();
  return errorEnvelopeSchema(errorCodeSchema).parse(json);
};
