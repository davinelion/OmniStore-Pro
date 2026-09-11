import { z } from "zod";

/** Coerce absent/None to null so partial upstream data cannot crash clients. */
export const nullable = <T extends z.ZodTypeAny>(inner: T) =>
  z.union([inner, z.null()]).optional().transform((v) => v ?? null);

export const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "invalid ISO date")
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const urlSchema = z
  .string()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "must be an http(s) URL")
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const paginationSchema = z.object({
  page: z.number().int().min(1).catch(1),
  perPage: z.number().int().min(0).catch(0),
  total: z.number().int().min(0).catch(0),
  totalPages: z.number().int().min(0).catch(0),
});
