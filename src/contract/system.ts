import { z } from "zod";
import { OrgUnitKind, Role } from "./enums";
import { ISODateTime, Id, MaskedPhone, UnitRef } from "./primitives";

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

/** Permission codes are finalised in M3; typed as strings until then. */
export const Permission = z.string();
export type Permission = z.infer<typeof Permission>;

/** GET /auth/me (M3). */
export const Me = z.object({
  user: z.object({ id: Id, name: z.string(), phone: MaskedPhone, email: z.string().nullable() }),
  role: Role,
  scope: UnitRef.extend({ kind: OrgUnitKind }).nullable(),
  permissions: z.array(Permission),
});
export type Me = z.infer<typeof Me>;
