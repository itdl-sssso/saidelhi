import { z } from "zod";
import { EventStatus, LinkPurpose, LinkState, PublicEventStatus, Role, SevaType, Source, SubmissionStatus, TimelineChannel } from "./enums";
import { Figure, Geo, I18nText, ISODateTime, Id, MaskedPhone, Media, UnitRef } from "./primitives";

export const ResultTile = z.object({ key: z.string(), label: I18nText, figure: Figure });
export type ResultTile = z.infer<typeof ResultTile>;

export const ResultBreakdown = z.object({
  key: z.string(),
  label: I18nText,
  bars: z.array(z.object({ label: z.string(), figure: Figure })),
});
export type ResultBreakdown = z.infer<typeof ResultBreakdown>;

export const EventResults = z.object({
  tiles: z.array(ResultTile),
  breakdowns: z.array(ResultBreakdown),
  followUp: z.object({ label: I18nText, done: z.number().int().nonnegative().nullable(), of: z.number().int().nonnegative() }).nullable(),
  photos: z.array(Media),
});
export type EventResults = z.infer<typeof EventResults>;

export const Venue = z.object({ name: z.string(), address: z.string(), geo: Geo.nullable() });
export type Venue = z.infer<typeof Venue>;

export const EventPublic = z.object({
  id: Id,
  title: I18nText,
  sevaType: SevaType,
  status: PublicEventStatus,
  startsAt: ISODateTime,
  endsAt: ISODateTime.nullable(),
  postponedTo: ISODateTime.nullable(),
  /** User-entered; shown as entered, not translated. */
  venue: Venue,
  samithi: UnitRef,
  district: UnitRef,
  description: I18nText,
  volunteersNeeded: z.number().int().nonnegative().nullable(),
  volunteersJoined: z.number().int().nonnegative(),
  bring: z.array(I18nText),
  partner: z.object({ name: z.string() }).nullable(),
  /** Centre number only. */
  centreContact: z.string().nullable(),
  publicLinkUrl: z.string().nullable(),
  /** Non-null only when status = approved. */
  results: EventResults.nullable(),
  articleSlug: z.string().nullable(),
  recurring: z.boolean(),
});
export type EventPublic = z.infer<typeof EventPublic>;

/** Compact event used by form links (spec 19) and inbox matches. */
export const EventCard = EventPublic.pick({ id: true, title: true, sevaType: true, startsAt: true, venue: true, samithi: true, district: true });
export type EventCard = z.infer<typeof EventCard>;

export const TimelineStep = z.object({
  status: z.union([EventStatus, z.literal("event_day")]),
  at: ISODateTime.nullable(),
  by: z.object({ role: Role, label: z.string() }).nullable(),
  channel: TimelineChannel.nullable(),
});
export type TimelineStep = z.infer<typeof TimelineStep>;

export const FormLink = z.object({
  id: Id,
  purpose: LinkPurpose,
  label: z.string(),
  sentTo: z.union([MaskedPhone, z.literal("qr")]).nullable(),
  state: LinkState,
  expiresAt: ISODateTime,
  uses: z.number().int().nonnegative(),
  maxUses: z.number().int().positive().nullable(),
  otpRequired: z.boolean(),
  lastOpenedAt: ISODateTime.nullable(),
  /** Only to authorised viewers; the token itself is never rendered. */
  url: z.string(),
});
export type FormLink = z.infer<typeof FormLink>;

/** M3 stub. */
export const SubmissionSummary = z.object({
  id: Id,
  linkLabel: z.string(),
  submittedAt: ISODateTime,
  submittedBy: MaskedPhone,
  source: Source,
  status: SubmissionStatus,
});
export type SubmissionSummary = z.infer<typeof SubmissionSummary>;

/** M3 stub. Served only through an authorised route. */
export const PrivateAttachment = z.object({
  id: Id,
  name: z.string(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: ISODateTime,
  url: z.string(),
});
export type PrivateAttachment = z.infer<typeof PrivateAttachment>;

export const EventAdmin = EventPublic.extend({
  status: EventStatus,
  source: Source,
  createdBy: z.object({ id: Id, label: z.string() }).nullable(),
  timeline: z.array(TimelineStep),
  links: z.array(FormLink),
  submissions: z.array(SubmissionSummary),
  attachments: z.array(PrivateAttachment),
  followUpCount: z.number().int().nonnegative().nullable(),
  reportDueAt: ISODateTime.nullable(),
  version: z.number().int().nonnegative(),
});
export type EventAdmin = z.infer<typeof EventAdmin>;
