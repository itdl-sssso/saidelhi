import { z } from "zod";
import { ISODateTime, Id } from "./primitives";

export const FeatureFlags = z.object({
  discourses: z.boolean(),
  offline_mode: z.boolean(),
  ai_extraction: z.boolean(),
});
export type FeatureFlags = z.infer<typeof FeatureFlags>;

export const Health = z.object({
  status: z.enum(["ok", "degraded"]),
  dataSource: z.enum(["mock", "db"]),
  db: z.enum(["ok", "down", "skipped"]),
  time: ISODateTime,
});
export type Health = z.infer<typeof Health>;

/** 201 body of POST /privacy/requests. */
export const PrivacyRequestCreated = z.object({ id: Id });
export type PrivacyRequestCreated = z.infer<typeof PrivacyRequestCreated>;
