import { z } from "zod";
import { GatheringKind, OrgUnitKind, PartnerKind, SevaType, Wing } from "./enums";
import { Geo, I18nText, ISODateTime, Id, Locale, Media, UnitRef } from "./primitives";

export const OrgUnit = z.object({
  id: Id,
  code: z.string(),
  kind: OrgUnitKind,
  name: I18nText,
  slug: z.string(),
  parentId: Id.nullable(),
  active: z.boolean(),
});
export type OrgUnit = z.infer<typeof OrgUnit>;

export const Gathering = z.object({
  day: z.number().int().min(0).max(6), // 0 = Sunday
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), // 'HH:mm' IST
  kind: GatheringKind,
  language: z.union([Locale, z.literal("mixed")]),
});
export type Gathering = z.infer<typeof Gathering>;

export const Centre = z.object({
  id: Id,
  slug: z.string(),
  samithiId: Id,
  districtId: Id,
  name: I18nText,
  address: I18nText,
  geo: Geo.nullable(),
  /** The centre's public number. Never a coordinator's personal phone. */
  contactPhone: z.string().nullable(),
  schedule: z.array(Gathering),
  photos: z.array(Media),
});
export type Centre = z.infer<typeof Centre>;

export const NextGathering = z.object({ at: ISODateTime, kind: GatheringKind });
export type NextGathering = z.infer<typeof NextGathering>;

/** Item of GET /centres. */
export const CentreListItem = Centre.extend({
  district: UnitRef,
  samithi: UnitRef,
  pincode: z.string().nullable(),
  nextGathering: NextGathering.nullable(),
  /** Only when a pincode/location was given and geodata is available. */
  distanceKm: z.number().nullable(),
});
export type CentreListItem = z.infer<typeof CentreListItem>;

export const Partner = z.object({
  id: Id,
  name: z.string(),
  kind: PartnerKind,
  city: z.string(),
});
export type Partner = z.infer<typeof Partner>;

export const SevaTypeInfo = z.object({
  code: SevaType,
  label: I18nText,
  /** Lucide icon name from the design-system vocabulary. */
  icon: z.string(),
  wing: Wing,
});
export type SevaTypeInfo = z.infer<typeof SevaTypeInfo>;
