// v0.6 (M5): public P1 payloads — Values, Programs, Program, Join, Districts index.
// Editorial copy (value prose, programme descriptions/steps, About text) lives in
// messages/{en,hi}.json, not in these DTOs; the API carries live data only.
import { z } from "zod";
import { Article, DiscourseSummary } from "./content";
import { GatheringKind, SevaType, ValueSlug, Wing } from "./enums";
import { EventPublic } from "./events";
import { KpiTile, LabelledFigure } from "./impact";
import { Partner } from "./org";
import { I18nText, ISODate, ISODateTime, Paged, UnitRef } from "./primitives";
import { Pagination, Slug, blankToUndefined, opt } from "./queries";

// ── Values (spec 02) ──────────────────────────────────────────────────────────

/** Fixed cycle order for prev/next (spec 02 §7). */
export const VALUE_ORDER = ValueSlug.options;

/**
 * Where each value is "lived through" (spec 02 §4 + design wireframes/value-page.jsx).
 * `sevaType`/`wing` null → link to /programs (overview). `sevaTypes` drives upcoming events.
 */
export const VALUE_LINKS = {
  sathya: { sevaType: null, wing: null, sevaTypes: ["study_circle"], gathering: "study_circle" },
  dharma: { sevaType: "bal_vikas", wing: "educational", sevaTypes: ["bal_vikas"], gathering: "bal_vikas" },
  shanti: { sevaType: "bhajan", wing: "spiritual", sevaTypes: ["bhajan", "study_circle"], gathering: "bhajan" },
  prema: { sevaType: "narayan_seva", wing: "service", sevaTypes: ["narayan_seva", "blood", "medical"], gathering: null },
  ahimsa: { sevaType: null, wing: null, sevaTypes: ["cleanliness"], gathering: null },
} as const satisfies Record<
  ValueSlug,
  { sevaType: SevaType | null; wing: Wing | null; sevaTypes: readonly SevaType[]; gathering: GatheringKind | null }
>;

export const ValueParams = z.object({ slug: ValueSlug });

/** GET /values/:slug */
export const ValuePayload = z.object({
  slug: ValueSlug,
  prev: ValueSlug,
  next: ValueSlug,
  lived: z.object({ sevaType: SevaType.nullable(), wing: Wing.nullable() }),
  /**
   * Live facts for the "Where it lives in our work" block, e.g.
   * `{key:'centres', figure: 62}` (centres holding this gathering kind weekly) or this year's
   * headline figure for the seva type (`meals`). [] → frontend shows copy only.
   */
  facts: z.array(LabelledFigure),
  /** Next 3 events (incl. recurring gathering rows) of `VALUE_LINKS[slug].sevaTypes`. */
  upcoming: z.array(EventPublic).max(3),
  /** null when the `discourses` flag is off (section hidden, no gap); else ≤3 on this theme. */
  discourses: z.array(DiscourseSummary).max(3).nullable(),
});
export type ValuePayload = z.infer<typeof ValuePayload>;

// ── Programs (spec 05) ────────────────────────────────────────────────────────

export const ProgramsQuery = z.object({ wing: opt(Wing) });
export type ProgramsQuery = z.infer<typeof ProgramsQuery>;

/** Item of GET /programs (active seva types, `seva_type.sort_order`). */
export const ProgramCard = z.object({
  sevaType: SevaType,
  label: I18nText,
  /** Lucide icon name. */
  icon: z.string(),
  wing: Wing,
  /** "Next: 26 Oct · Noida" — earliest upcoming public event (non-recurring) of this type. */
  next: z.object({ eventId: z.string(), startsAt: ISODateTime, district: UnitRef }).nullable(),
  /** "This year: 1,240 meals" — headline approved figure this year; null when none. */
  thisYear: LabelledFigure.nullable(),
  /** `/programs/<sevaType>` (unlocalised; UI prefixes locale). */
  href: z.string(),
});
export type ProgramCard = z.infer<typeof ProgramCard>;

// ── Program (spec 06) ─────────────────────────────────────────────────────────

export const ProgramParams = z.object({ type: SevaType });

/** GET /programs/:type */
export const ProgramDetail = ProgramCard.omit({ next: true, thisYear: true }).extend({
  /** 3–4 tiles, this year, approved (+estimates labelled). null → "Results will appear here". */
  kpis: z.array(KpiTile).nullable(),
  /**
   * Ordered funnel (eye: found → referred → operated; medical: only when follow-up exists).
   * `figure.value:null` → "—", never 0 (spec 06 acceptance). null → no funnel for this type.
   */
  funnel: z.array(LabelledFigure).nullable(),
  upcoming: z.array(EventPublic).max(6),
  /** Recent approved-event reports / articles linked to this type (≤3). */
  articles: z.array(Article).max(3),
  /** Partners who worked events of this type (fallback: by partner kind). Names as text. */
  partners: z.array(Partner),
});
export type ProgramDetail = z.infer<typeof ProgramDetail>;

// ── Join (spec 11) ────────────────────────────────────────────────────────────

export const JoinQuery = z.object({
  district: opt(Slug),
  sevaType: opt(SevaType),
  from: opt(ISODate),
  to: opt(ISODate),
  page: Pagination.shape.page,
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(12)),
});
export type JoinQuery = z.infer<typeof JoinQuery>;

/** Public bot contact for "Tell me about future seva" (no form on the page — spec 11). */
export const WhatsAppContact = z.object({
  /** Display number (`WA_DISPLAY_NUMBER`), e.g. "+91 98100 00000"; null → section shows "coming soon". */
  number: z.string().nullable(),
  /** `https://wa.me/<digits>?text=<keyword>`; QR is generated client side from this. */
  waMeUrl: z.string().nullable(),
  /** Word the visitor sends; the bot's join flow starts on it. */
  keyword: z.string(),
});
export type WhatsAppContact = z.infer<typeof WhatsAppContact>;

/**
 * v0.10: an event on /join. Only that Sevadal are needed: no head-counts, no phone numbers
 * (people reach us through the organisation's WhatsApp number or the opt-in form).
 */
export const JoinEvent = EventPublic.pick({
  id: true,
  title: true,
  sevaType: true,
  status: true,
  startsAt: true,
  endsAt: true,
  postponedTo: true,
  venue: true,
  samithi: true,
  district: true,
  recurring: true,
}).extend({ sevadalNeeded: z.literal(true) });
export type JoinEvent = z.infer<typeof JoinEvent>;

/**
 * GET /join → `{ events, whatsapp }`. Events: public, non-recurring, status planned|postponed,
 * `volunteersNeeded > volunteersJoined` (not sent), from today (IST) when `from` absent, soonest first.
 */
export const JoinPayload = z.object({
  events: Paged(JoinEvent),
  whatsapp: WhatsAppContact,
});
export type JoinPayload = z.infer<typeof JoinPayload>;

// ── Districts index (About §4, District breadcrumb) ─────────────────────────

/** Item of GET /districts (active districts, name order). */
export const DistrictSummary = z.object({
  district: UnitRef,
  samithiCount: z.number().int().nonnegative(),
  centreCount: z.number().int().nonnegative(),
});
export type DistrictSummary = z.infer<typeof DistrictSummary>;
