import type { z } from "zod";

export function validate<TSchema extends z.ZodType>(schema: TSchema, value: unknown): z.infer<TSchema> {
  return schema.parse(value);
}
