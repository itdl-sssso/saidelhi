// v0.8 (M7) discourses: public list/detail (specs 15–16) and the translation workspace (spec 39).
// Everything is behind the `discourses` feature flag: public routes 404 while it is off; the
// workspace works with the flag off but Publish is blocked (`publishBlockers` → "flag_off").
import { z } from "zod";
import { DiscourseBlockStatus, DiscourseBlockType, DiscourseStatus, DiscourseTheme, ValueSlug } from "./enums";
import { Discourse, DiscourseSummary } from "./content";
import { I18nText, ISODate, ISODateTime, Id, PageMeta } from "./primitives";
import { opt, Pagination, Slug } from "./queries";

const Text = (max: number) => z.string().trim().max(max);
const Count = z.number().int().nonnegative();
const Version = z.number().int().positive();

// ---- Constants --------------------------------------------------------------

/** Theme labels + the catalog heading each key is imported from (`catalog.json` `themes`). */
export const DISCOURSE_THEMES: Record<DiscourseTheme, { label: I18nText; catalog: string }> = {
  character: { label: { en: "Character", hi: "चरित्र" }, catalog: "Character" },
  education: { label: { en: "Education and purpose", hi: "शिक्षा और उद्देश्य" }, catalog: "Education / purpose" },
  discipline: { label: { en: "Discipline", hi: "अनुशासन" }, catalog: "Discipline / self-control" },
  ceiling_on_desires: { label: { en: "Ceiling on desires", hi: "इच्छाओं पर अंकुश" }, catalog: "Ceiling on desires / choices" },
  technology: { label: { en: "Technology and distraction", hi: "तकनीक और भटकाव" }, catalog: "Technology / distraction" },
  habits: { label: { en: "Addiction and habits", hi: "लत और आदतें" }, catalog: "Addiction / vices / habits" },
  parents: { label: { en: "Parents", hi: "माता-पिता" }, catalog: "Parents" },
  friendship: { label: { en: "Friendship", hi: "मित्रता" }, catalog: "Friendship / peer influence" },
  self_confidence: { label: { en: "Self-confidence", hi: "आत्मविश्वास" }, catalog: "Self-confidence" },
  leadership: { label: { en: "Leadership", hi: "नेतृत्व" }, catalog: "Leadership / role models" },
  service: { label: { en: "Service", hi: "सेवा" }, catalog: "Service / seva" },
  time: { label: { en: "Time", hi: "समय" }, catalog: "Time management / mindfulness" },
  career_ethics: { label: { en: "Career and ethics", hi: "करियर और नैतिकता" }, catalog: "Career / business ethics" },
  mental_peace: { label: { en: "Mental peace", hi: "मन की शान्ति" }, catalog: "Mental peace / emotions" },
};

/** Value page (spec 02) "Related discourses": published discourses on any of these themes, ≤3. */
export const VALUE_DISCOURSE_THEMES: Record<ValueSlug, DiscourseTheme[]> = {
  sathya: ["character", "education", "self_confidence"],
  dharma: ["discipline", "career_ethics", "leadership"],
  shanti: ["mental_peace", "time", "technology"],
  prema: ["friendship", "parents", "service"],
  ahimsa: ["habits", "ceiling_on_desires"],
};

/** Credit line required on every public discourse page (spec 15 §1). */
export const DISCOURSE_CREDIT: I18nText = {
  en: "Published with permission of Sri Sathya Sai Sadhana Trust, Publications Division.",
  hi: "श्री सत्य साई साधना ट्रस्ट, प्रकाशन प्रभाग की अनुमति से प्रकाशित।",
};

export const QUOTES_MIN = 2;
export const QUOTES_MAX = 4;

// ---- Public (15–16) ---------------------------------------------------------

/** GET /discourses?theme&q — all published (≈87, no paging). `q` matches title (EN+HI), why, place, occasion. */
export const DiscoursesQuery = z.object({
  theme: opt(DiscourseTheme),
  q: opt(Text(80)),
});
export type DiscoursesQuery = z.infer<typeof DiscoursesQuery>;

export const DiscourseQuote = z.object({ en: z.string(), hi: z.string().nullable(), blockId: z.string().nullable() });
export type DiscourseQuote = z.infer<typeof DiscourseQuote>;

/** List card (spec 15 §4). */
export const DiscourseCard = DiscourseSummary.extend({
  occasion: z.string(),
  why: I18nText,
  coll: z.string(),
});
export type DiscourseCard = z.infer<typeof DiscourseCard>;

export const DiscoursesPayload = z.object({
  items: z.array(DiscourseCard),
  /** All 14 themes in `DiscourseTheme` order; `count` = published discourses with the theme (before `q`). */
  themes: z.array(z.object({ key: DiscourseTheme, label: I18nText, count: Count })),
  /** Shareable featured quote (deterministic per IST day), null when nothing is published. */
  featured: z.object({ quote: DiscourseQuote, discourse: DiscourseSummary }).nullable(),
  credit: I18nText,
});
export type DiscoursesPayload = z.infer<typeof DiscoursesPayload>;

// ---- Media (v0.9 M7.1): audio/video recordings of a discourse (URLs only, nothing hosted) ----

export const DiscourseMediaKind = z.enum(["audio", "video"]);
export type DiscourseMediaKind = z.infer<typeof DiscourseMediaKind>;
export const DiscourseMediaProvider = z.enum(["radiosai", "youtube"]);
export type DiscourseMediaProvider = z.infer<typeof DiscourseMediaProvider>;
export const DiscourseMediaConfidence = z.enum(["high", "medium", "low"]);
export type DiscourseMediaConfidence = z.infer<typeof DiscourseMediaConfidence>;

/** Public shape: only approved items are served, in `sort` order. */
export const DiscourseMedia = z.object({
  id: Id,
  kind: DiscourseMediaKind,
  provider: DiscourseMediaProvider,
  /** mp3 URL (audio) or watch URL (video). */
  url: z.string(),
  /** YouTube video id (video) else null. */
  externalId: z.string().nullable(),
  title: z.string(),
  channel: z.string().nullable(),
  durationS: z.number().int().nonnegative().nullable(),
  recordedDate: ISODate.nullable(),
  /** false = a devotee/centre upload, not the Sri Sathya Sai Media Centre: shown with an "unofficial recording" note. */
  official: z.boolean(),
  /** Credit page (Media Centre discourse page) or null. */
  sourcePage: z.string().nullable(),
});
export type DiscourseMedia = z.infer<typeof DiscourseMedia>;

/** Workspace shape: every candidate. `confidence` null for official audio. */
export const AdminDiscourseMedia = DiscourseMedia.extend({
  approved: z.boolean(),
  confidence: DiscourseMediaConfidence.nullable(),
  score: z.number().int().nullable(),
  sort: z.number().int(),
});
export type AdminDiscourseMedia = z.infer<typeof AdminDiscourseMedia>;

/** POST /admin/discourses/:id/media/:mediaId — approve/hide and/or reorder; no `version` check. → AdminDiscourseDetail. */
export const DiscourseMediaPatch = z
  .object({ approved: z.boolean().optional(), sort: z.number().int().min(0).max(1000).optional() })
  .refine((v) => v.approved !== undefined || v.sort !== undefined, { message: "Nothing to change." });
export const DiscourseMediaParams = z.object({ id: Id, mediaId: Id });

export type DiscourseMediaPatch = z.infer<typeof DiscourseMediaPatch>;

/** GET /discourses/:slug → only `published` (else 404). Hindi of every block is approved, so `hi` is non-null. */
export const DiscourseDetail = Discourse.extend({
  related: z.array(DiscourseSummary).max(3),
  /** Value page to link (first `VALUE_DISCOURSE_THEMES` match), null if none. */
  value: ValueSlug.nullable(),
  translation: z.object({
    /** e.g. "LTST Delhi NCR reviewers"; null until settings name one. */
    reviewedBy: I18nText.nullable(),
    publishedAt: ISODateTime,
  }),
  credit: I18nText,
  /** v0.9: approved recordings (live data, not part of the publish snapshot). */
  media: z.array(DiscourseMedia),
});
export type DiscourseDetail = z.infer<typeof DiscourseDetail>;

// ---- Admin workspace (39) ---------------------------------------------------

export const GlossaryTerm = z.object({ term: z.string(), hi: z.string(), gloss: z.string().nullable() });
export type GlossaryTerm = z.infer<typeof GlossaryTerm>;

/** A glossary term present in the English paragraph whose fixed Hindi rendering is absent from the draft. */
export const GlossaryIssue = z.object({ term: z.string(), expected: z.string() });
export type GlossaryIssue = z.infer<typeof GlossaryIssue>;

/** GET /admin/discourses?q&theme&status&reviewer&page — `meta.counts` keyed by `DiscourseStatus` (+ `all`). */
export const AdminDiscoursesQuery = Pagination.extend({
  q: opt(Text(80)),
  theme: opt(DiscourseTheme),
  status: opt(DiscourseStatus),
  /** user id, or "none" for unassigned */
  reviewer: opt(z.union([Id, z.literal("none")])),
});
export type AdminDiscoursesQuery = z.infer<typeof AdminDiscoursesQuery>;

export const DiscourseReviewer = z.object({ id: Id, name: z.string() });
export type DiscourseReviewer = z.infer<typeof DiscourseReviewer>;

export const AdminDiscourseRow = z.object({
  id: Id,
  n: z.number().int(),
  slug: z.string(),
  title: I18nText,
  coll: z.string(),
  themes: z.array(DiscourseTheme),
  status: DiscourseStatus,
  reviewer: DiscourseReviewer.nullable(),
  blocks: z.object({ total: Count, approved: Count, empty: Count }),
  updatedAt: ISODateTime,
});
export type AdminDiscourseRow = z.infer<typeof AdminDiscourseRow>;

export const AdminDiscoursesMeta = PageMeta.extend({
  counts: z.record(z.string(), Count),
  flagOn: z.boolean(),
  published: Count,
});
export type AdminDiscoursesMeta = z.infer<typeof AdminDiscoursesMeta>;

export const DiscourseMeta = z.object({
  /** Print numbering, e.g. "Sathya Sai Speaks Vol 6, Ch 26". */
  collPrint: z.string(),
  /** Online numbering when it differs, else null. */
  collOnline: z.string().nullable(),
  date: z.string(),
  /** Parsed when the free-text date is a full day, else null (sorting). */
  isoDate: ISODate.nullable(),
  place: z.string(),
  occasion: z.string(),
  sourceUrl: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  retrieved: ISODate.nullable(),
});
export type DiscourseMeta = z.infer<typeof DiscourseMeta>;

export const AdminDiscourseBlock = z.object({
  id: z.string(),
  /** 1-based paragraph number shown in the editor. */
  idx: z.number().int().positive(),
  type: DiscourseBlockType,
  en: z.string(),
  hi: z.string().nullable(),
  status: DiscourseBlockStatus,
  /** True when an imported AI draft exists for this block (Request AI draft can restore it). */
  hasAiDraft: z.boolean(),
  /** v0.9.2: imported AI draft text (null when none) — shown in the restore preview. */
  aiDraft: z.string().nullable(),
  /** v0.9.2: Hindi text in the published snapshot (`published` null: no snapshot or block not in it). */
  published: z.object({ hi: z.string().nullable() }).nullable(),
  /** v0.9.2: snapshot exists and this paragraph's Hindi differs from it. */
  differsFromPublished: z.boolean(),
  glossaryIssues: z.array(GlossaryIssue),
});
export type AdminDiscourseBlock = z.infer<typeof AdminDiscourseBlock>;

export const DiscoursePublishBlocker = z.enum(["flag_off", "not_approved"]);
export type DiscoursePublishBlocker = z.infer<typeof DiscoursePublishBlocker>;

/** GET /admin/discourses/:id */
export const AdminDiscourseDetail = z.object({
  id: Id,
  n: z.number().int(),
  slug: z.string(),
  title: I18nText,
  why: I18nText,
  meta: DiscourseMeta,
  themes: z.array(DiscourseTheme),
  status: DiscourseStatus,
  reviewer: DiscourseReviewer.nullable(),
  blocks: z.array(AdminDiscourseBlock),
  quotes: z.array(DiscourseQuote),
  /** Import-time translator notes (read-only). */
  notes: z.array(z.string()),
  publishedAt: ISODateTime.nullable(),
  flagOn: z.boolean(),
  publishBlockers: z.array(DiscoursePublishBlocker),
  /** v0.9.2: a snapshot exists and the live text/quotes/title/why/themes differ from it. */
  dirtySincePublish: z.boolean(),
  /** v0.9.2: what differs from the snapshot (all zero/false when not dirty). */
  dirtySummary: z.object({ blocks: Count, quotes: z.boolean(), title: z.boolean(), why: z.boolean(), themes: z.boolean() }),
  /** v0.9: all audio/video candidates (approved or not). */
  media: z.array(AdminDiscourseMedia),
  /** People who may be assigned as reviewer (holders of `discourses.review`). */
  reviewers: z.array(DiscourseReviewer),
  can: z.object({ edit: z.boolean(), review: z.boolean(), publish: z.boolean() }),
  version: Version,
});
export type AdminDiscourseDetail = z.infer<typeof AdminDiscourseDetail>;

/** POST /admin/discourses ("Add to shortlist") — English source pasted; paragraphs split on blank lines. */
export const DiscourseCreate = z.object({
  title: z.object({ en: Text(200).min(1), hi: Text(200).nullable().default(null) }),
  slug: Slug.optional(),
  meta: DiscourseMeta.omit({ isoDate: true }),
  themes: z.array(DiscourseTheme).min(1).max(4),
  why: z.object({ en: Text(300), hi: Text(300).nullable().default(null) }),
  sourceText: z.string().trim().min(1).max(200_000),
});
export type DiscourseCreate = z.infer<typeof DiscourseCreate>;

/**
 * PATCH /admin/discourses/:id — any subset. Block edits: changing `hi` sets status `edited`
 * (unless `status` is sent); `status: approved` needs `discourses.review` and non-empty `hi`.
 * Editing a block of an `approved`/`published` discourse moves it back to `in_review`
 * (published stays live on the last approved text until re-published — backend keeps `published_snapshot`).
 */
export const DiscoursePatch = z.object({
  version: Version,
  title: z.object({ en: Text(200).min(1), hi: Text(200).nullable() }).optional(),
  why: z.object({ en: Text(300), hi: Text(300).nullable() }).optional(),
  meta: DiscourseMeta.omit({ isoDate: true }).partial().optional(),
  themes: z.array(DiscourseTheme).min(1).max(4).optional(),
  reviewerId: Id.nullable().optional(),
  blocks: z
    .array(z.object({ id: z.string(), hi: z.string().max(20_000).nullable().optional(), status: DiscourseBlockStatus.optional() }))
    .max(500)
    .optional(),
  /** Each `en` must occur verbatim in its block's English (`quoteMatches`); ≤ QUOTES_MAX. */
  quotes: z.array(DiscourseQuote).max(QUOTES_MAX).optional(),
});
export type DiscoursePatch = z.infer<typeof DiscoursePatch>;

/** POST /admin/discourses/:id/ai-draft — restores the imported AI draft into `empty` (or listed) blocks. 422 when none stored. */
export const DiscourseAiDraftBody = z.object({ version: Version, blockIds: z.array(z.string()).max(500).optional() });
export type DiscourseAiDraftBody = z.infer<typeof DiscourseAiDraftBody>;

/** POST …/send-review (needs a reviewer), …/approve (all blocks approved + 2–4 valid quotes), …/publish (flag on + approved), …/unpublish. */
export const DiscourseActionBody = z.object({ version: Version, reviewerId: Id.optional() });
export type DiscourseActionBody = z.infer<typeof DiscourseActionBody>;

/**
 * POST /admin/discourses/:id/revert (v0.9.2; perm `discourses.edit`, version → 409).
 * `all`: restore text, quotes, title, why, themes and status from the publish snapshot (422 when none or nothing differs).
 * `block` + `published`: that paragraph's Hindi back to the snapshot (status approved); `ai`: back to the imported draft (status ai_draft).
 */
export const DiscourseRevertBody = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all"), version: Version }),
  z.object({ scope: z.literal("block"), version: Version, blockId: z.string().min(1).max(32), source: z.enum(["published", "ai"]) }),
]);
export type DiscourseRevertBody = z.infer<typeof DiscourseRevertBody>;

// ---- Pure helpers (shared by editor previews and backend checks) ------------

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Glossary terms used in `en` whose fixed Hindi is missing from `hi`. Empty when `hi` is null. */
export function glossaryIssues(en: string, hi: string | null, glossary: readonly GlossaryTerm[]): GlossaryIssue[] {
  if (!hi) return [];
  const out: GlossaryIssue[] = [];
  for (const g of glossary) {
    if (new RegExp(`\\b${escapeRe(g.term)}\\b`, "i").test(en) && !hi.includes(g.hi)) out.push({ term: g.term, expected: g.hi });
  }
  return out;
}

/** Quote text must be a verbatim slice of its paragraph (whitespace-normalised). */
export function quoteMatches(quote: Pick<DiscourseQuote, "en" | "blockId">, blocks: readonly { id: string; en: string }[]): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const b = blocks.find((x) => x.id === quote.blockId);
  return !!b && norm(quote.en).length > 0 && norm(b.en).includes(norm(quote.en));
}

/** Why Approve is disabled (empty = allowed). */
export function approveBlockers(d: { blocks: readonly { status: DiscourseBlockStatus }[]; quotes: readonly unknown[] }): ("blocks" | "quotes")[] {
  const out: ("blocks" | "quotes")[] = [];
  if (d.blocks.length === 0 || d.blocks.some((b) => b.status !== "approved")) out.push("blocks");
  if (d.quotes.length < QUOTES_MIN || d.quotes.length > QUOTES_MAX) out.push("quotes");
  return out;
}

/** Why Publish is disabled (empty = allowed). */
export function publishBlockers(status: DiscourseStatus, flagOn: boolean): DiscoursePublishBlocker[] {
  const out: DiscoursePublishBlocker[] = [];
  if (!flagOn) out.push("flag_off");
  if (status !== "approved" && status !== "published") out.push("not_approved");
  return out;
}
