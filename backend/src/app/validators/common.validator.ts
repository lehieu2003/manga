import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const csv = (fallback: string[] = []) =>
  z
    .string()
    .optional()
    .transform((value) => value?.split(",").map((item) => item.trim()).filter(Boolean) ?? fallback);
