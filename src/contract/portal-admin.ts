// v0.7 (M6) portal P1 DTOs, queries and bodies (§5.4): form templates + builder (30–31),
// uploads (33), centres (35), partners (36), content (38), impact controls (40),
// migration + redirects (41), volunteers (43), reports/exports (44), data health (45),
// follow-up (46), privacy (47), settings (49). Lists use the §2 envelope; extra `meta`
// keys are documented per schema. Mutations carry `version` (409 CONFLICT when stale).
import { z } from "zod";
import { ScopeRef } from "./auth";
import { ArticleCategory, ContentKind, LinkPurpose, PartnerKind, PrivacyRequestStatus, PrivacyRequestType, Role, SevaType, Source, Wing } from "./enums";
import { EventCard } from "./events";
import { ExcelColumn } from "./form-builder";
import { Answers, FormDefinition } from "./forms";
import { KpiTile } from "./impact";
import { Gathering, Partner, SevaTypeInfo } from "./org";
import { Figure, Geo, I18nText, ISODate, ISODateTime, ISOMonth, Id, Locale, MaskedPhone, Media, PageMeta, UnitRef } from "./primitives";
import { opt, Pagination, QueryBool, Slug } from "./queries";

// ---- Shared -----------------------------------------------------------------

const Text = (max: number) => z.string().trim().max(max);
const Int = z.number().int();
const Count = z.number().int().nonnegative();
const Version = z.number().int().positive();

/** Bilingual input: English required, Hindi optional (null = missing, shows "Available in English"). */
export const I18nInput = (max: number) => z.object({ en: Text(max).min(1), hi: Text(max).nullable().default(null) });
/** Bilingual input where both may be empty (help text, notes). */
export const I18nOptionalInput = (max: number) => z.object({ en: Text(max), hi: Text(max).nullable().default(null) });

/** Language completeness for list rows ("EN ✓ HI —"). */
export const LangStatus = z.object({ en: z.boolean(), hi: z.boolean() });
export type LangStatus = z.infer<typeof LangStatus>;

/** Who did something (display only). */
export const ActorName = z.object({ id: Id.nullable(), name: z.string() });
export type ActorName = z.infer<typeof ActorName>;

/** Tab counts on list endpoints (`meta.counts`). */
export const CountsMeta = PageMeta.extend({ counts: z.record(z.string(), Count) });
export type CountsMeta = z.infer<typeof CountsMeta>;

/** Multipart limits for portal uploads (sheets, centre/content photos, sitemap). */
export const UPLOAD_LIMITS = {
  sheetBytes: 5 * 1024 * 1024,
  sheetMimes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.ms-excel",
  ],
  sheetExt: [".xlsx", ".csv"],
  maxRows: 1000,
  photoBytes: 8 * 1024 * 1024,
  photoMimes: ["image/jpeg", "image/png", "image/webp"],
  sitemapBytes: 10 * 1024 * 1024,
} as const;

// ---- Form templates (30) + builder (31) -------------------------------------

export const FormTemplateRow = z.object({
  id: Id,
  code: z.string(),
  sevaType: SevaType.nullable(),
  purpose: LinkPurpose,
  title: I18nText,
  /** Lucide icon (seva type icon; `file-text` for non-seva templates). */
  icon: z.string(),
  current: z.object({ version: Version, publishedAt: ISODateTime }).nullable(),
  /** Unpublished draft ("Draft of v4"). */
  draft: z.object({ version: Version, updatedAt: ISODateTime }).nullable(),
  /** Value fields of the current (else draft) version. */
  fieldCount: Count,
  languages: LangStatus,
  /** Value fields missing Hindi in the draft (else current) version. */
  missingHi: Count,
  eventsThisYear: Count,
  active: z.boolean(),
});
export type FormTemplateRow = z.infer<typeof FormTemplateRow>;

export const ChangeRequestUrgency = z.enum(["next_camp", "month", "no_rush"]);
export type ChangeRequestUrgency = z.infer<typeof ChangeRequestUrgency>;
export const ChangeRequestStatus = z.enum(["open", "declined", "drafted"]);
export type ChangeRequestStatus = z.infer<typeof ChangeRequestStatus>;

export const FormChangeRequest = z.object({
  id: Id,
  templateId: Id,
  templateTitle: I18nText,
  /** Requesting district (null when sent by a state user). */
  from: UnitRef.nullable(),
  by: z.string(),
  text: z.string(),
  urgency: ChangeRequestUrgency,
  status: ChangeRequestStatus,
  createdAt: ISODateTime,
  decidedAt: ISODateTime.nullable(),
  note: z.string().nullable(),
});
export type FormChangeRequest = z.infer<typeof FormChangeRequest>;

/** GET /admin/forms (`forms.read`) — single object. District users see their own requests only. */
export const FormsPayload = z.object({
  templates: z.array(FormTemplateRow),
  changeRequests: z.array(FormChangeRequest),
  can: z.object({ build: z.boolean(), requestChange: z.boolean() }),
});
export type FormsPayload = z.infer<typeof FormsPayload>;

export const FormVersionSummary = z.object({
  version: Version,
  status: z.enum(["draft", "published"]),
  publishedAt: ISODateTime.nullable(),
  publishedBy: z.string().nullable(),
  fieldCount: Count,
  /** Active links still issued with this version. */
  linksUsing: Count,
});
export type FormVersionSummary = z.infer<typeof FormVersionSummary>;

/** KPI mapping choices in the builder ("Maps to: eye.spectacles"). */
export const KpiOption = z.object({ key: z.string(), label: I18nText, sevaType: SevaType.nullable() });
export type KpiOption = z.infer<typeof KpiOption>;

/** GET /admin/forms/:id. Builder checks/Excel/WhatsApp previews are computed client-side with `form-builder.ts`. */
export const FormTemplateDetail = z.object({
  template: FormTemplateRow,
  /** Editable draft; null when none (the first PATCH creates "draft of v<n+1>" from the published one). */
  draft: FormDefinition.nullable(),
  published: FormDefinition.nullable(),
  versions: z.array(FormVersionSummary),
  kpiOptions: z.array(KpiOption),
  /** Draft row version for PATCH/publish; null when there is no draft. */
  version: Version.nullable(),
  can: z.object({ edit: z.boolean(), publish: z.boolean() }),
});
export type FormTemplateDetail = z.infer<typeof FormTemplateDetail>;

export const FormIdParams = z.object({ id: Id });
export const FormVersionParams = z.object({ id: Id, version: z.coerce.number().int().positive() });

/** POST /admin/forms → 201 FormTemplateDetail (empty draft with core fields, or a copy of `fromTemplateId`). */
export const FormTemplateCreate = z.object({
  title: I18nInput(200),
  sevaType: SevaType.nullable(),
  purpose: LinkPurpose.default("report"),
  fromTemplateId: Id.optional(),
});
export type FormTemplateCreate = z.input<typeof FormTemplateCreate>;

/**
 * PATCH /admin/forms/:id — replaces the draft definition (validated with FormDefinition +
 * lintDefinition; locked core fields cannot be removed → 422). `version: null` creates the draft.
 */
export const FormDraftPatch = z.object({ definition: FormDefinition, version: Version.nullable() });
export type FormDraftPatch = z.infer<typeof FormDraftPatch>;

/** POST /admin/forms/:id/publish → FormTemplateDetail. 422 `fields` keyed by field id when a blocking check fails. */
export const FormPublishBody = z.object({ version: Version });
export type FormPublishBody = z.infer<typeof FormPublishBody>;

/** POST /admin/forms/:id/duplicate → 201 FormTemplateDetail (new template, draft v1). */
export const FormDuplicateBody = z.object({ title: I18nInput(200), sevaType: SevaType.nullable().optional() });
export type FormDuplicateBody = z.input<typeof FormDuplicateBody>;

/** POST /admin/forms/:id/test — dry run against the draft (else published); nothing is stored. */
export const FormTestBody = z.object({ answers: Answers, locale: Locale.default("en") });
export type FormTestBody = z.input<typeof FormTestBody>;
export const FormTestResult = z.object({
  ok: z.boolean(),
  errors: z.record(z.string(), z.string()),
  warnings: z.record(z.string(), z.string()),
  kpis: z.array(z.object({ key: z.string(), dim: z.string(), value: z.number() })),
});
export type FormTestResult = z.infer<typeof FormTestResult>;

/** POST /admin/forms/:id/change-requests (district) → 201 FormChangeRequest. */
export const ChangeRequestCreate = z.object({ text: Text(1000).min(5), urgency: ChangeRequestUrgency.default("no_rush") });
export type ChangeRequestCreate = z.input<typeof ChangeRequestCreate>;

/** PATCH /admin/forms/change-requests/:id (state). `drafted` = a draft was started for it. */
export const ChangeRequestDecision = z.object({ status: z.enum(["declined", "drafted"]), note: Text(500).optional() });
export type ChangeRequestDecision = z.infer<typeof ChangeRequestDecision>;

/** GET /admin/forms/:id/template.xlsx?samithi=&version= (current version by default). */
export const TemplateXlsxQuery = z.object({ samithi: opt(Id), version: opt(z.coerce.number().int().positive()) });
export type TemplateXlsxQuery = z.infer<typeof TemplateXlsxQuery>;

// ---- Uploads (33) -------------------------------------------------------------

export const UploadStatus = z.enum(["preview", "loaded", "no_changes", "discarded", "failed"]);
export type UploadStatus = z.infer<typeof UploadStatus>;

/** Why a row was rejected (health "rejects by reason", spec 45). */
export const UploadRejectReason = z.enum([
  "number_too_high",
  "rule_failed",
  "missing_value",
  "bad_date",
  "future_date",
  "unknown_samithi",
  "out_of_scope",
  "wrong_template",
  "duplicate_row",
  "other",
]);
export type UploadRejectReason = z.infer<typeof UploadRejectReason>;

export const UploadIssue = z.object({
  row: Int.positive(),
  /** Sheet header the issue is about; null = whole row. */
  column: z.string().nullable(),
  level: z.enum(["error", "warn"]),
  reason: UploadRejectReason,
  /** Plain-language message, both languages (spec 33: "without technical words"). */
  message: I18nText,
});
export type UploadIssue = z.infer<typeof UploadIssue>;

export const UploadRowAction = z.enum(["new", "update", "same", "reject"]);
export type UploadRowAction = z.infer<typeof UploadRowAction>;

export const UploadPreviewRow = z.object({
  row: Int.positive(),
  /** Raw cell text by header. */
  cells: z.record(z.string(), z.string()),
  action: UploadRowAction,
  issues: z.array(UploadIssue),
});
export type UploadPreviewRow = z.infer<typeof UploadPreviewRow>;

export const UploadCounts = z.object({
  rows: Count,
  ok: Count,
  warnings: Count,
  errors: Count,
  new: Count,
  updated: Count,
  unchanged: Count,
  rejected: Count,
});
export type UploadCounts = z.infer<typeof UploadCounts>;

export const UploadBatch = z.object({
  id: Id,
  fileName: z.string(),
  sevaType: SevaType,
  template: z.object({ id: Id, version: Version, title: I18nText }),
  samithi: UnitRef.nullable(),
  uploadedBy: z.string(),
  uploadedAt: ISODateTime,
  loadedAt: ISODateTime.nullable(),
  status: UploadStatus,
  counts: UploadCounts,
  version: Version,
});
export type UploadBatch = z.infer<typeof UploadBatch>;

/** POST /admin/uploads → 201 / GET /admin/uploads/:id. `rows`: rows with issues first, then up to 5 OK rows (≤200). */
export const UploadPreview = UploadBatch.extend({
  columns: z.array(ExcelColumn),
  rows: z.array(UploadPreviewRow),
  /** Same file (sha256) already loaded → status `no_changes` and this points at it. */
  sameAs: z.object({ id: Id, loadedAt: ISODateTime }).nullable(),
});
export type UploadPreview = z.infer<typeof UploadPreview>;

/**
 * Non-file fields of POST /admin/uploads (multipart: `file` + these). One seva type per file.
 * Row identity = samithi + date + seva type: new → event (source `upload`, status
 * `report_submitted`) + submission awaiting district approval; existing unapproved → update.
 */
export const UploadForm = z.object({ sevaType: SevaType, samithi: opt(Id) });
export type UploadForm = z.infer<typeof UploadForm>;

/** POST /admin/uploads/:id/confirm → UploadBatch (status `loaded`; counts final). Error rows are never loaded. */
export const UploadConfirm = z.object({ version: Version });
export type UploadConfirm = z.infer<typeof UploadConfirm>;

/** POST /admin/uploads/inbox (multipart `file`, `sevaType?`, `note?`) — "Use your own file" → review inbox item. */
export const UploadToInboxForm = z.object({ sevaType: opt(SevaType), note: opt(Text(500)) });
export type UploadToInboxForm = z.infer<typeof UploadToInboxForm>;
export const UploadToInboxResult = z.object({ inboxItemId: Id });
export type UploadToInboxResult = z.infer<typeof UploadToInboxResult>;

export const UploadsQuery = Pagination.extend({ status: opt(UploadStatus), sevaType: opt(SevaType) });
export type UploadsQuery = z.infer<typeof UploadsQuery>;

/** GET /admin/uploads/options — what the stepper offers this coordinator. */
export const UploadOptions = z.object({
  sevaTypes: z.array(
    z.object({ sevaType: SevaType, label: I18nText, icon: z.string(), templateId: Id, version: Version, title: I18nText }),
  ),
  /** Samithis in scope (samithi coord: just theirs, preselected). */
  samithis: z.array(UnitRef.extend({ code: z.string() })),
});
export type UploadOptions = z.infer<typeof UploadOptions>;

/** GET /admin/uploads/template.xlsx?sevaType=&samithi= (uploads.manage; prefilled samithi code). */
export const UploadTemplateQuery = z.object({ sevaType: SevaType, samithi: opt(Id) });
export type UploadTemplateQuery = z.infer<typeof UploadTemplateQuery>;

// ---- Centres (35) -----------------------------------------------------------

export const CentreAdminRow = z.object({
  id: Id,
  slug: z.string(),
  name: I18nText,
  district: UnitRef,
  samithi: UnitRef,
  active: z.boolean(),
  hasGeo: z.boolean(),
  hasPhone: z.boolean(),
  gatherings: Count,
  photos: Count,
  languages: LangStatus,
  updatedAt: ISODateTime,
});
export type CentreAdminRow = z.infer<typeof CentreAdminRow>;

export const CentresAdminQuery = Pagination.extend({
  q: opt(Text(80)),
  district: opt(Id),
  active: opt(QueryBool),
});
export type CentresAdminQuery = z.infer<typeof CentresAdminQuery>;

/** GET /admin/centres/:id */
export const CentreAdmin = z.object({
  id: Id,
  slug: z.string(),
  samithiId: Id,
  district: UnitRef,
  samithi: UnitRef,
  name: I18nText,
  address: I18nText,
  pincode: z.string().nullable(),
  geo: Geo.nullable(),
  contactPhone: z.string().nullable(),
  schedule: z.array(Gathering),
  photos: z.array(Media),
  active: z.boolean(),
  /** Public page path (`/centres/<slug>`). */
  publicPath: z.string(),
  updatedAt: ISODateTime,
  version: Version,
});
export type CentreAdmin = z.infer<typeof CentreAdmin>;

const Pincode = z.string().trim().regex(/^\d{6}$/, "Use the 6-digit pincode");
/** Centre phone: digits, spaces, +, - only. A number belonging to a portal user is refused (422 "personal number"). */
const PublicPhone = z.string().trim().regex(/^\+?[\d\s-]{8,20}$/, "Enter a phone number");

export const CentreInput = z.object({
  samithiId: Id,
  slug: Slug.optional(),
  name: I18nInput(160),
  address: I18nInput(400),
  pincode: Pincode.nullable().default(null),
  geo: Geo.nullable().default(null),
  contactPhone: PublicPhone.nullable().default(null),
  schedule: z.array(Gathering).max(20).default([]),
  photos: z.array(Media).max(12).default([]),
});
export type CentreInput = z.input<typeof CentreInput>;

/** PATCH /admin/centres/:id */
export const CentrePatch = z
  .object({
    name: I18nInput(160).optional(),
    address: I18nInput(400).optional(),
    pincode: Pincode.nullable().optional(),
    geo: Geo.nullable().optional(),
    contactPhone: PublicPhone.nullable().optional(),
    schedule: z.array(Gathering).max(20).optional(),
    photos: z.array(Media).max(12).optional(),
    active: z.boolean().optional(),
    version: Version,
  })
  .strict();
export type CentrePatch = z.infer<typeof CentrePatch>;

/** POST /admin/centres/:id/photos (multipart `file`, `alt`) → 201 Media (public, under MEDIA_ROOT/centres). Add it via PATCH `photos`. */
export const PhotoUploadForm = z.object({ alt: Text(200).min(1) });
export type PhotoUploadForm = z.infer<typeof PhotoUploadForm>;


// ---- Partners (36) ----------------------------------------------------------

export const PartnerAdmin = Partner.extend({
  nameHi: z.string().nullable(),
  /** Internal contact (role/office). Never public. */
  contact: z.string().nullable(),
  /** "With <partner>" on public Event/Program pages. */
  showPublicly: z.boolean(),
  active: z.boolean(),
  eventsThisYear: Count,
  version: Version,
});
export type PartnerAdmin = z.infer<typeof PartnerAdmin>;

export const PartnersQuery = Pagination.extend({
  q: opt(Text(80)),
  kind: opt(PartnerKind),
  city: opt(Text(80)),
  active: opt(QueryBool),
});
export type PartnersQuery = z.infer<typeof PartnersQuery>;

export const PartnerInput = z.object({
  name: Text(160).min(1),
  nameHi: Text(160).nullable().default(null),
  kind: PartnerKind,
  city: Text(80).min(1),
  contact: Text(200).nullable().default(null),
  showPublicly: z.boolean().default(true),
});
export type PartnerInput = z.input<typeof PartnerInput>;

export const PartnerPatch = z
  .object({
    name: Text(160).min(1).optional(),
    nameHi: Text(160).nullable().optional(),
    kind: PartnerKind.optional(),
    city: Text(80).min(1).optional(),
    contact: Text(200).nullable().optional(),
    showPublicly: z.boolean().optional(),
    active: z.boolean().optional(),
    version: Version,
  })
  .strict();
export type PartnerPatch = z.infer<typeof PartnerPatch>;

// ---- Content (38) -----------------------------------------------------------

/** List tabs. `article` = articles + stories/special/key programmes; `centenary` = both centenary categories. */
export const ContentTab = z.enum(["all", "article", "news", "activities", "centenary", "home_section", "thought_for_day", "announcement"]);
export type ContentTab = z.infer<typeof ContentTab>;

export const ContentStatus = z.enum(["draft", "scheduled", "published", "hidden"]);
export type ContentStatus = z.infer<typeof ContentStatus>;

/** What a row/editor is: an article (native or legacy post) or a small content item. */
export const ContentType = z.union([z.literal("article"), ContentKind]);
export type ContentType = z.infer<typeof ContentType>;

export const ContentRow = z.object({
  /** Native ids are ULIDs; legacy posts not yet edited are `legacy-<postId>`. */
  id: z.string(),
  type: ContentType,
  category: ArticleCategory.nullable(),
  title: I18nText,
  district: UnitRef.nullable(),
  languages: LangStatus,
  status: ContentStatus,
  /** Publish time (scheduled/published) or display date (thought for the day). */
  publishAt: ISODateTime.nullable(),
  date: ISODate.nullable(),
  updatedAt: ISODateTime,
  legacy: z.boolean(),
  eventId: Id.nullable(),
});
export type ContentRow = z.infer<typeof ContentRow>;

export const ContentQuery = Pagination.extend({
  tab: opt(ContentTab),
  status: opt(ContentStatus),
  /** `hi_missing` = Hindi title or body missing. */
  lang: opt(z.enum(["hi_missing"])),
  district: opt(Id),
  q: opt(Text(120)),
});
export type ContentQuery = z.infer<typeof ContentQuery>;

/** `meta.counts` keyed by ContentTab. */
export const ContentMeta = CountsMeta;

const EventRef = EventCard;

/** GET /admin/content/:id for articles. Body HTML is sanitised server-side on every write. */
export const ArticleEditor = z.object({
  kind: z.literal("article"),
  id: z.string(),
  slug: z.string(),
  category: ArticleCategory,
  title: I18nText,
  summary: I18nText,
  /**
   * Sanitised HTML. A results card is the element `<div data-event-results="<eventId>"></div>`;
   * the public article page renders the event's approved results there.
   */
  bodyHtml: I18nText,
  cover: Media.nullable(),
  gallery: z.array(Media),
  district: UnitRef.nullable(),
  event: EventRef.nullable(),
  status: ContentStatus,
  publishAt: ISODateTime.nullable(),
  legacyId: z.number().int().nullable(),
  /** `/news/<slug>`. */
  publicPath: z.string(),
  updatedAt: ISODateTime,
  /** 0 for a legacy post not yet copied (first PATCH copies it into the native table). */
  version: z.number().int().nonnegative(),
});
export type ArticleEditor = z.infer<typeof ArticleEditor>;

/** GET /admin/content/:id for thought-for-day, announcements, home sections. */
export const ContentItemEditor = z.object({
  kind: z.literal("item"),
  id: Id,
  type: ContentKind,
  /** Home section key (e.g. `wing.service`), else null. */
  key: z.string().nullable(),
  title: I18nText.nullable(),
  body: I18nText.nullable(),
  source: I18nText.nullable(),
  href: z.string().nullable(),
  date: ISODate.nullable(),
  startsAt: ISODateTime.nullable(),
  endsAt: ISODateTime.nullable(),
  status: ContentStatus,
  updatedAt: ISODateTime,
  version: Version,
});
export type ContentItemEditor = z.infer<typeof ContentItemEditor>;

export const ContentDetail = z.discriminatedUnion("kind", [ArticleEditor, ContentItemEditor]);
export type ContentDetail = z.infer<typeof ContentDetail>;

const ArticleFields = {
  slug: Slug.optional(),
  category: ArticleCategory,
  title: I18nInput(300),
  summary: I18nOptionalInput(1000),
  bodyHtml: I18nOptionalInput(200_000),
  cover: Media.nullable().default(null),
  gallery: z.array(Media).max(40).default([]),
  districtId: Id.nullable().default(null),
  eventId: Id.nullable().default(null),
};

const ItemFields = {
  key: Text(64).nullable().default(null),
  title: I18nOptionalInput(300).nullable().default(null),
  body: I18nOptionalInput(4000).nullable().default(null),
  source: I18nOptionalInput(300).nullable().default(null),
  href: Text(400).nullable().default(null),
  date: ISODate.nullable().default(null),
  startsAt: ISODateTime.nullable().default(null),
  endsAt: ISODateTime.nullable().default(null),
};

/** POST /admin/content → 201 ContentDetail (status draft). */
export const ContentCreate = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("article"), ...ArticleFields }),
  z.object({ kind: z.literal("item"), type: ContentKind, ...ItemFields }),
]);
export type ContentCreate = z.input<typeof ContentCreate>;

/**
 * PATCH /admin/content/:id → ContentDetail. Publishing = `status: "published"` (publishAt
 * null = now) or `"scheduled"` with a future `publishAt`; `hidden` unpublishes.
 */
export const ContentPatch = z.object({
  slug: Slug.optional(),
  category: ArticleCategory.optional(),
  title: I18nOptionalInput(300).optional(),
  summary: I18nOptionalInput(1000).optional(),
  bodyHtml: I18nOptionalInput(200_000).optional(),
  body: I18nOptionalInput(4000).nullable().optional(),
  source: I18nOptionalInput(300).nullable().optional(),
  href: Text(400).nullable().optional(),
  date: ISODate.nullable().optional(),
  startsAt: ISODateTime.nullable().optional(),
  endsAt: ISODateTime.nullable().optional(),
  cover: Media.nullable().optional(),
  gallery: z.array(Media).max(40).optional(),
  districtId: Id.nullable().optional(),
  eventId: Id.nullable().optional(),
  status: ContentStatus.optional(),
  publishAt: ISODateTime.nullable().optional(),
  /** 0 when editing a legacy post for the first time. */
  version: z.number().int().nonnegative(),
});
export type ContentPatch = z.infer<typeof ContentPatch>;

/** POST /admin/content/from-event/:eventId → 201 ArticleEditor (draft `news`, results card + summary prefilled; event must be approved). */
export const FromEventParams = z.object({ eventId: Id });

/** POST /admin/content/media (multipart `file`, `alt`) → 201 Media (public). Photo rules shown in UI. */
export const ContentMediaForm = PhotoUploadForm;

/** GET /admin/content/thoughts?from&to (≤ 62 days) → ThoughtDay[] (one per day; empty days `item: null`). */
export const ThoughtsQuery = z.object({ from: ISODate, to: ISODate });
export type ThoughtsQuery = z.infer<typeof ThoughtsQuery>;
export const ThoughtDay = z.object({
  date: ISODate,
  item: ContentItemEditor.nullable(),
  /** What the home page shows that day (repeats the last thought when empty). */
  shown: z.object({ text: I18nText, source: I18nText.nullable(), repeated: z.boolean() }).nullable(),
});
export type ThoughtDay = z.infer<typeof ThoughtDay>;

/** POST /admin/content/thoughts/import (multipart `file`: CSV `date,text_en,text_hi,source_en,source_hi`). */
export const ThoughtsImportResult = z.object({ created: Count, updated: Count, errors: z.array(z.object({ row: Int.positive(), message: I18nText })) });
export type ThoughtsImportResult = z.infer<typeof ThoughtsImportResult>;

// ---- Impact controls (40) ---------------------------------------------------

export const ImpactKpiControl = z.object({
  key: z.string(),
  label: I18nText,
  icon: z.string(),
  /** Shown on the public Impact page. */
  publicImpact: z.boolean(),
  /** One of the (≤4) Home tiles. */
  homeTile: z.boolean(),
  /** Public note under the tile ("Counts services given…"). */
  note: I18nText.nullable(),
  /** All-time public figure (for the toggle list). */
  current: Figure,
});
export type ImpactKpiControl = z.infer<typeof ImpactKpiControl>;

/** GET /admin/impact */
export const ImpactAdminPayload = z.object({
  kpis: z.array(ImpactKpiControl),
  showEstimates: z.boolean(),
  estimateTooltip: I18nText,
  /** Public tiles exactly as Home/Impact would render them with these settings. */
  preview: z.array(KpiTile),
  version: Version,
});
export type ImpactAdminPayload = z.infer<typeof ImpactAdminPayload>;

/** PATCH /admin/impact → ImpactAdminPayload. At most 4 `homeTile: true`. */
export const ImpactSettingsPatch = z.object({
  kpis: z.array(z.object({ key: z.string(), publicImpact: z.boolean(), homeTile: z.boolean(), note: I18nOptionalInput(300).nullable().optional() })).optional(),
  showEstimates: z.boolean().optional(),
  estimateTooltip: I18nInput(300).optional(),
  version: Version,
});
export type ImpactSettingsPatch = z.input<typeof ImpactSettingsPatch>;

export const ImpactEstimateRow = z.object({
  id: Id,
  district: UnitRef,
  year: Int,
  /** null = whole year. */
  month: ISOMonth.nullable(),
  sevaType: SevaType.nullable(),
  kpiKey: z.string(),
  kpiLabel: I18nText,
  value: Count,
  source: z.string(),
  enteredBy: z.string(),
  visible: z.boolean(),
  createdAt: ISODateTime,
});
export type ImpactEstimateRow = z.infer<typeof ImpactEstimateRow>;

export const ImpactEstimatesQuery = Pagination.extend({ district: opt(Id), year: opt(z.coerce.number().int().min(2000).max(2100)) });
export type ImpactEstimatesQuery = z.infer<typeof ImpactEstimatesQuery>;

/** POST /admin/impact/estimates → 201 ImpactEstimateRow. Only for periods before the platform (year ≤ last full year). */
export const ImpactEstimateInput = z.object({
  districtId: Id,
  year: z.number().int().min(2000).max(2100),
  month: ISOMonth.nullable().default(null),
  sevaType: SevaType.nullable().default(null),
  kpiKey: Text(64).min(1),
  value: Count,
  source: Text(200).min(1),
  visible: z.boolean().default(true),
});
export type ImpactEstimateInput = z.input<typeof ImpactEstimateInput>;

/** PATCH /admin/impact/estimates/:id (last write wins; audited). DELETE → 204. */
export const ImpactEstimatePatch = ImpactEstimateInput.partial().strict();
export type ImpactEstimatePatch = z.infer<typeof ImpactEstimatePatch>;

// ---- Migration + redirects (41) ---------------------------------------------

/** `legacy_db` = Django tables already loaded by `pnpm db:import-legacy`; `sitemap` = old sitemap.xml (redirect harvesting). */
export const MigrationSource = z.enum(["legacy_db", "sitemap"]);
export type MigrationSource = z.infer<typeof MigrationSource>;

export const MigrationRunStatus = z.enum(["mapping", "importing", "done", "failed"]);
export type MigrationRunStatus = z.infer<typeof MigrationRunStatus>;

export const MigrationTarget = z.union([ArticleCategory, z.enum(["skip", "hidden", "redirect_only"])]);
export type MigrationTarget = z.infer<typeof MigrationTarget>;

export const MigrationTypeRow = z.object({
  /** e.g. `post:N` (legacy category letter), `page:about-us`, `url` (sitemap). */
  sourceType: z.string(),
  label: z.string(),
  items: Count,
  becomes: MigrationTarget,
  /** Flag risky types (may contain identifiable photos / personal data). */
  risky: z.boolean(),
});
export type MigrationTypeRow = z.infer<typeof MigrationTypeRow>;

export const MigrationProblem = z.enum(["broken_images", "no_date", "hindi_only", "personal_data", "empty_body", "slug_clash", "unmatched_url"]);
export type MigrationProblem = z.infer<typeof MigrationProblem>;

export const MigrationIssue = z.object({
  /** Legacy post id or old URL. */
  ref: z.string(),
  title: z.string(),
  problem: MigrationProblem,
  /** Portal path to fix it (content editor), null when nothing to open. */
  fixPath: z.string().nullable(),
});
export type MigrationIssue = z.infer<typeof MigrationIssue>;

export const MigrationRun = z.object({
  id: Id,
  source: MigrationSource,
  fileName: z.string().nullable(),
  status: MigrationRunStatus,
  startedAt: ISODateTime,
  finishedAt: ISODateTime.nullable(),
  by: z.string(),
  types: z.array(MigrationTypeRow),
  counts: z.object({ items: Count, imported: Count, skipped: Count, needsFix: Count, redirects: Count }),
  /** First 200 issues; full list in report.csv. */
  issues: z.array(MigrationIssue),
  version: Version,
});
export type MigrationRun = z.infer<typeof MigrationRun>;

/** POST /admin/migration/runs — JSON `{source:"legacy_db"}` or multipart (`source=sitemap`, `file`) → 201 MigrationRun (status `mapping`, preview counts). */
export const MigrationRunCreate = z.object({ source: MigrationSource });
export type MigrationRunCreate = z.infer<typeof MigrationRunCreate>;

/** PATCH /admin/migration/runs/:id (status `mapping` only) → MigrationRun with recomputed preview. */
export const MigrationMapPatch = z.object({
  types: z.array(z.object({ sourceType: z.string(), becomes: MigrationTarget })),
  version: Version,
});
export type MigrationMapPatch = z.infer<typeof MigrationMapPatch>;

/** POST /admin/migration/runs/:id/import `{version}` → MigrationRun (`done`). Idempotent: re-running updates, never duplicates. */
export const MigrationImportBody = z.object({ version: Version });

export const RedirectSource = z.enum(["rule", "manual", "migration"]);
export type RedirectSource = z.infer<typeof RedirectSource>;

export const RedirectRow = z.object({
  from: z.string(),
  to: z.string(),
  permanent: z.boolean(),
  source: RedirectSource,
  hits: Count,
  updatedAt: ISODateTime,
});
export type RedirectRow = z.infer<typeof RedirectRow>;

export const RedirectsQuery = Pagination.extend({ q: opt(Text(200)), source: opt(RedirectSource) });
export type RedirectsQuery = z.infer<typeof RedirectsQuery>;

/** POST /admin/redirects (upsert by `from`) → RedirectRow. `from` normalised (no trailing slash/query); `to` is a site path or https URL. */
export const RedirectInput = z.object({
  from: Text(500).regex(/^\/\S*$/, "Start with /"),
  to: Text(500).regex(/^(\/\S*|https:\/\/\S+)$/, "Use a path starting with / or an https:// link"),
  permanent: z.boolean().default(true),
});
export type RedirectInput = z.input<typeof RedirectInput>;

/** DELETE /admin/redirects?from=/old/path → 204 (rule-based redirects cannot be deleted). */
export const RedirectDeleteQuery = z.object({ from: Text(500).min(1) });

// ---- Volunteers (43) --------------------------------------------------------

export const VolunteerEventRow = z.object({
  event: EventCard,
  needed: Count.nullable(),
  joined: Count,
  full: z.boolean(),
  /** Sign-ups are deleted on this date (event end + 30 days). */
  deleteOn: ISODate,
});
export type VolunteerEventRow = z.infer<typeof VolunteerEventRow>;

export const VolunteersQuery = Pagination.extend({
  samithi: opt(Id),
  district: opt(Id),
  /** Default `next30`. */
  when: opt(z.enum(["next30", "upcoming", "past"])),
});
export type VolunteersQuery = z.infer<typeof VolunteersQuery>;

/** `meta.notifyOnSignup`: this coordinator's WhatsApp alert preference. */
export const VolunteersMeta = PageMeta.extend({ notifyOnSignup: z.boolean() });
export type VolunteersMeta = z.infer<typeof VolunteersMeta>;

/** GET /admin/volunteers/:eventId → VolunteerSignup[] (viewing is audited). First names and masked phones only. */
export const VolunteerSignup = z.object({
  id: Id,
  firstName: z.string(),
  phone: MaskedPhone,
  signedUpAt: ISODateTime,
  channel: z.enum(["web", "whatsapp"]),
  /** Beyond `needed` → wait list. */
  waitlist: z.boolean(),
});
export type VolunteerSignup = z.infer<typeof VolunteerSignup>;

/** PATCH /admin/volunteers/notify → `{ notifyOnSignup }`. */
export const VolunteerNotifyBody = z.object({ notifyOnSignup: z.boolean() });
export type VolunteerNotifyBody = z.infer<typeof VolunteerNotifyBody>;

// ---- Reports + exports (44) -------------------------------------------------

export const MonthlyReport = z.object({
  id: Id,
  month: ISOMonth,
  scope: ScopeRef,
  status: z.enum(["ready", "generating", "failed"]),
  generatedAt: ISODateTime.nullable(),
  pages: Count.nullable(),
  sizeBytes: Count.nullable(),
  /** Download path (`/api/v1/admin/reports/monthly/<id>.pdf`). */
  url: z.string(),
});
export type MonthlyReport = z.infer<typeof MonthlyReport>;

export const ReportRecipient = z.object({ userId: Id, name: z.string(), role: Role, hasEmail: z.boolean() });
export type ReportRecipient = z.infer<typeof ReportRecipient>;

export const ReportScheduleKind = z.enum(["monthly_state", "district_summary"]);
export type ReportScheduleKind = z.infer<typeof ReportScheduleKind>;

export const ReportSchedule = z.object({
  id: Id,
  kind: ReportScheduleKind,
  scope: ScopeRef,
  /** Day of month (IST, 06:00). Default 7. */
  dayOfMonth: Int.min(1).max(28),
  recipients: z.array(ReportRecipient),
  lastSentAt: ISODateTime.nullable(),
  active: z.boolean(),
  version: Version,
});
export type ReportSchedule = z.infer<typeof ReportSchedule>;

export const ExportKind = z.enum(["event_reports", "events", "kpi_totals"]);
export type ExportKind = z.infer<typeof ExportKind>;

/** Exportable columns per kind. Personal fields never appear here. */
export const ExportField = z.object({ key: z.string(), label: I18nText, kinds: z.array(ExportKind), default: z.boolean() });
export type ExportField = z.infer<typeof ExportField>;

export const ExportLogRow = z.object({
  id: Id,
  at: ISODateTime,
  by: z.string(),
  kind: ExportKind,
  scope: UnitRef,
  from: ISODate,
  to: ISODate,
  rows: Count,
  reason: z.string(),
});
export type ExportLogRow = z.infer<typeof ExportLogRow>;

/** GET /admin/reports (`reports.export`; district sees its own scope). */
export const ReportsPayload = z.object({
  monthly: z.array(MonthlyReport),
  schedules: z.array(ReportSchedule),
  exportFields: z.array(ExportField),
  recentExports: z.array(ExportLogRow),
  can: z.object({ manageSchedules: z.boolean() }),
});
export type ReportsPayload = z.infer<typeof ReportsPayload>;

/**
 * POST /admin/exports → 200 `text/csv; charset=utf-8` with `Content-Disposition: attachment`.
 * Errors stay JSON (422). Logged in `export_log` + audit with the reason.
 */
export const ExportRequest = z.object({
  kind: ExportKind,
  scopeId: Id,
  from: ISODate,
  to: ISODate,
  /** Empty = all seva types. */
  sevaTypes: z.array(SevaType).max(10).default([]),
  fields: z.array(z.string().max(64)).min(1).max(60),
  reason: Text(300).min(5),
});
export type ExportRequest = z.input<typeof ExportRequest>;

/** PATCH /admin/reports/schedules/:id (state) → ReportSchedule. */
export const ReportSchedulePatch = z.object({
  recipientIds: z.array(Id).max(50).optional(),
  dayOfMonth: Int.min(1).max(28).optional(),
  active: z.boolean().optional(),
  version: Version,
});
export type ReportSchedulePatch = z.infer<typeof ReportSchedulePatch>;

/** POST /admin/reports/monthly `{month}` (state) → 202 MonthlyReport (regenerate). */
export const MonthlyReportCreate = z.object({ month: ISOMonth, scopeId: Id.optional() });
export type MonthlyReportCreate = z.infer<typeof MonthlyReportCreate>;

// ---- Data health (45) -------------------------------------------------------

export const HealthQuery = z.object({ scope: opt(Id), from: opt(ISOMonth), to: opt(ISOMonth) });
export type HealthQuery = z.infer<typeof HealthQuery>;

export const HealthTile = z.object({
  key: z.enum(["on_time_rate", "event_to_report_days", "waiting_approval", "estimate_share"]),
  label: I18nText,
  value: z.number().nullable(),
  unit: z.enum(["pct", "days", "count"]),
  /** Change vs the previous period (points / days / count). */
  delta: z.number().nullable(),
  note: I18nText.nullable(),
});
export type HealthTile = z.infer<typeof HealthTile>;

/** GET /admin/health. Rows carry `href` to the place to fix it. Internal figures: no <5 suppression. */
export const HealthPayload = z.object({
  scope: ScopeRef,
  months: z.array(ISOMonth),
  tiles: z.array(HealthTile),
  /** Share (0–100) of finished events with a report within 7 days, per month; null = no events. */
  reportingRate: z.array(z.object({ unit: UnitRef, active: z.boolean(), href: z.string(), cells: z.array(z.number().nullable()) })),
  pendingApprovals: z.array(z.object({ unit: UnitRef, waiting: Count, oldestDays: Count, href: z.string() })),
  reportLag: z.array(z.object({ unit: UnitRef, medianDays: z.number(), slowestDays: z.number(), href: z.string() })),
  uploads: z.object({
    batches: Count,
    rowsLoaded: Count,
    rowsRejected: Count,
    rejectsByReason: z.array(z.object({ reason: UploadRejectReason, count: Count })),
  }),
  channelMix: z.array(z.object({ source: Source, count: Count, pct: z.number() })),
  estimateShare: z.object({ pct: z.number(), estimated: Count, total: Count }),
});
export type HealthPayload = z.infer<typeof HealthPayload>;

// ---- Follow-up (46, restricted) ---------------------------------------------

export const FollowUpStatus = z.enum(["referred", "scheduled", "done", "declined", "unreachable"]);
export type FollowUpStatus = z.infer<typeof FollowUpStatus>;

export const FollowUpRow = z.object({
  id: Id,
  name: z.string(),
  age: Count.nullable(),
  gender: z.enum(["female", "male", "other"]).nullable(),
  locality: z.string().nullable(),
  /** Masked until revealed (POST …/reveal-phone). null = no phone given. */
  phone: MaskedPhone.nullable(),
  camp: z.object({ eventId: Id, title: I18nText, date: ISODate, samithi: UnitRef }),
  referredAt: ISODate,
  status: FollowUpStatus,
  surgeryDate: ISODate.nullable(),
  daysWaiting: Count,
  consent: z.boolean(),
  lastContactAt: ISODateTime.nullable(),
  /** Deleted on this date (1 year after surgery/decline or last contact). */
  deleteOn: ISODate.nullable(),
  version: Version,
});
export type FollowUpRow = z.infer<typeof FollowUpRow>;

export const FollowUpQuery = Pagination.extend({
  /** `open` (default) = referred | scheduled | unreachable. */
  status: opt(z.union([z.enum(["open", "all"]), FollowUpStatus])),
  q: opt(Text(80)),
  event: opt(Id),
  waitingMin: opt(z.coerce.number().int().min(0).max(3650)),
});
export type FollowUpQuery = z.infer<typeof FollowUpQuery>;

export const FollowUpLogEntry = z.object({
  at: ISODateTime,
  by: z.string().nullable(),
  kind: z.enum(["referred", "revealed", "call", "status", "note", "viewed"]),
  text: z.string(),
});
export type FollowUpLogEntry = z.infer<typeof FollowUpLogEntry>;

/** GET /admin/follow-up/:id (viewing is logged). */
export const FollowUpDetail = FollowUpRow.extend({ history: z.array(FollowUpLogEntry) });
export type FollowUpDetail = z.infer<typeof FollowUpDetail>;

/** POST /admin/follow-up/:id/reveal-phone (`followup.reveal`, logged) → `{ phone }` raw. Never cached by the client. */
export const RevealedPhone = z.object({ phone: z.string() });
export type RevealedPhone = z.infer<typeof RevealedPhone>;

/** PATCH /admin/follow-up/:id → FollowUpDetail. */
export const FollowUpPatch = z.object({
  status: FollowUpStatus.optional(),
  surgeryDate: ISODate.nullable().optional(),
  note: Text(1000).min(1).optional(),
  version: Version,
});
export type FollowUpPatch = z.infer<typeof FollowUpPatch>;

/** POST /admin/follow-up/:id/calls → FollowUpDetail. */
export const FollowUpCall = z.object({
  outcome: z.enum(["answered", "no_answer", "wrong_number", "call_back"]),
  minutes: Int.min(0).max(180).nullable().default(null),
  note: Text(1000).optional(),
  version: Version,
});
export type FollowUpCall = z.input<typeof FollowUpCall>;

// ---- Privacy (47, restricted) -----------------------------------------------

export const PrivacyRequestRow = z.object({
  id: Id,
  /** "PR-0142" */
  ref: z.string(),
  name: z.string(),
  phone: MaskedPhone,
  type: PrivacyRequestType,
  receivedAt: ISODateTime,
  dueAt: ISODateTime,
  /** Negative = overdue. */
  daysLeft: Int,
  status: PrivacyRequestStatus,
  assignee: ActorName.nullable(),
  closedAt: ISODateTime.nullable(),
});
export type PrivacyRequestRow = z.infer<typeof PrivacyRequestRow>;

export const PrivacyRequestsQuery = Pagination.extend({ status: opt(z.union([z.literal("open"), PrivacyRequestStatus])) });
export type PrivacyRequestsQuery = z.infer<typeof PrivacyRequestsQuery>;

export const PersonDataKind = z.enum([
  "volunteer_signup",
  "whatsapp_optin",
  "whatsapp_conversation",
  "followup",
  "submission_personal",
  "portal_user",
  "privacy_request",
]);
export type PersonDataKind = z.infer<typeof PersonDataKind>;

export const PersonDataMatch = z.object({ id: Id, kind: PersonDataKind, label: z.string(), at: ISODateTime.nullable(), erasable: z.boolean() });
export type PersonDataMatch = z.infer<typeof PersonDataMatch>;

export const PrivacyStep = z.enum(["found", "exported", "erased", "replied"]);
export type PrivacyStep = z.infer<typeof PrivacyStep>;

/** GET /admin/privacy/requests/:id (opening is logged). */
export const PrivacyRequestDetail = PrivacyRequestRow.extend({
  details: z.string(),
  locale: Locale,
  /** null until "Find data" ran. */
  matches: z.array(PersonDataMatch).nullable(),
  steps: z.record(PrivacyStep, ISODateTime.nullable()),
  history: z.array(z.object({ at: ISODateTime, by: z.string().nullable(), action: z.string() })),
  can: z.object({ act: z.boolean() }),
  version: Version,
});
export type PrivacyRequestDetail = z.infer<typeof PrivacyRequestDetail>;

/** PATCH /admin/privacy/requests/:id → PrivacyRequestDetail. */
export const PrivacyRequestPatch = z.object({
  status: PrivacyRequestStatus.optional(),
  assigneeId: Id.nullable().optional(),
  version: Version,
});
export type PrivacyRequestPatch = z.infer<typeof PrivacyRequestPatch>;

/** POST …/find `{version}` → detail with `matches` (by the request's phone). GET …/export.json → the person's data (download, logged). */
export const PrivacyFindBody = z.object({ version: Version });

/** POST …/erase → detail. Deletes/anonymises the chosen records; event counts stay (they hold no name). */
export const PrivacyEraseBody = z.object({ matchIds: z.array(Id).min(1).max(500), version: Version });
export type PrivacyEraseBody = z.infer<typeof PrivacyEraseBody>;

/** POST …/reply → detail. Sent by WhatsApp (template `privacy_reply`) in the request's locale. */
export const PrivacyReplyBody = z.object({ message: Text(2000).min(5), version: Version });
export type PrivacyReplyBody = z.infer<typeof PrivacyReplyBody>;

/** GET /admin/privacy/consents */
export const ConsentSummary = z.object({
  byForm: z.array(
    z.object({ templateId: Id, form: I18nText, purpose: z.string(), given: Count, withdrawn: Count, lastAt: ISODateTime.nullable() }),
  ),
  whatsappOptins: z.object({ optedIn: Count, pending: Count, stopped: Count }),
  recentWithdrawals: z.array(z.object({ at: ISODateTime, form: I18nText, purpose: z.string() })),
});
export type ConsentSummary = z.infer<typeof ConsentSummary>;

export const RetentionKey = z.enum([
  "volunteer_signups",
  "whatsapp_messages",
  "inbox_media",
  "register_scans",
  "followup",
  "privacy_requests",
  "otp",
]);
export type RetentionKey = z.infer<typeof RetentionKey>;

/** GET /admin/privacy/retention → RetentionJob[]. PATCH /admin/privacy/retention/:key `{enabled}` (not for `locked`). */
export const RetentionJob = z.object({
  key: RetentionKey,
  keptFor: I18nText,
  lastRunAt: ISODateTime.nullable(),
  lastDeleted: Count.nullable(),
  nextRunAt: ISODateTime.nullable(),
  /** Rows that the next run would delete. */
  due: Count,
  enabled: z.boolean(),
  locked: z.boolean(),
});
export type RetentionJob = z.infer<typeof RetentionJob>;
export const RetentionPatch = z.object({ enabled: z.boolean() });
export type RetentionPatch = z.infer<typeof RetentionPatch>;

export const BreachStepKey = z.enum(["contain", "assess", "notify_board", "notify_people", "lessons"]);
export type BreachStepKey = z.infer<typeof BreachStepKey>;

export const Breach = z.object({
  id: Id,
  /** "BR-003" */
  ref: z.string(),
  title: z.string(),
  details: z.string(),
  discoveredAt: ISODateTime,
  /** discoveredAt + 72 h (Data Protection Board notice). */
  deadlineAt: ISODateTime,
  status: z.enum(["open", "closed"]),
  affected: Count.nullable(),
  steps: z.array(z.object({ key: BreachStepKey, doneAt: ISODateTime.nullable(), by: z.string().nullable(), note: z.string().nullable() })),
  createdBy: z.string(),
  closedAt: ISODateTime.nullable(),
  version: Version,
});
export type Breach = z.infer<typeof Breach>;

/** POST /admin/privacy/breaches → 201 Breach ("Start breach procedure"). */
export const BreachCreate = z.object({ title: Text(200).min(3), details: Text(4000).default(""), discoveredAt: ISODateTime.optional() });
export type BreachCreate = z.input<typeof BreachCreate>;

/** PATCH /admin/privacy/breaches/:id → Breach. */
export const BreachPatch = z.object({
  step: z.object({ key: BreachStepKey, done: z.boolean(), note: Text(1000).optional() }).optional(),
  affected: Count.nullable().optional(),
  status: z.enum(["open", "closed"]).optional(),
  version: Version,
});
export type BreachPatch = z.infer<typeof BreachPatch>;

/** Data protection lead (setting `privacy.dpo`); null name = "To be appointed". */
export const DataProtectionLead = z.object({ name: z.string().nullable(), contact: z.string().nullable() });
export type DataProtectionLead = z.infer<typeof DataProtectionLead>;

/** GET /admin/privacy (tab badges + DPO). PATCH /admin/privacy/dpo `DataProtectionLead` (state admin). */
export const PrivacyOverview = z.object({
  dpo: DataProtectionLead,
  counts: z.object({ openRequests: Count, overdueRequests: Count, openBreaches: Count }),
  can: z.object({ manage: z.boolean(), editDpo: z.boolean() }),
});
export type PrivacyOverview = z.infer<typeof PrivacyOverview>;

// ---- Settings (49) ----------------------------------------------------------

export const SevaTypeAdmin = SevaTypeInfo.extend({
  /** Public on/off (inactive types are hidden from public pages and planning). */
  active: z.boolean(),
  sortOrder: Int,
  template: z.object({ id: Id, title: I18nText, version: Version.nullable() }).nullable(),
  version: Version,
});
export type SevaTypeAdmin = z.infer<typeof SevaTypeAdmin>;

/** POST /admin/settings/seva-types — only built-in `SevaType` codes not yet present. */
export const SevaTypeCreate = z.object({ code: SevaType, label: I18nInput(120), icon: Text(48).min(1), wing: Wing });
export type SevaTypeCreate = z.input<typeof SevaTypeCreate>;

/** PATCH /admin/settings/seva-types/:code */
export const SevaTypePatch = z
  .object({
    label: I18nInput(120).optional(),
    icon: Text(48).min(1).optional(),
    wing: Wing.optional(),
    templateId: Id.nullable().optional(),
    active: z.boolean().optional(),
    sortOrder: Int.min(0).max(999).optional(),
    version: Version,
  })
  .strict();
export type SevaTypePatch = z.infer<typeof SevaTypePatch>;

/** Row of the `kpi_definition` table (seeded from domain/kpi.ts `KPI_DEFS`). `key`, `suppress`, `served` are fixed. */
export const KpiDefinition = z.object({
  key: z.string(),
  label: I18nText,
  sevaType: SevaType.nullable(),
  how: z.enum(["sum", "derived"]),
  /** Plain-language formula ("Sum of 'Spectacles given' on approved eye camp reports"). */
  formula: I18nText,
  publicImpact: z.boolean(),
  homeTile: z.boolean(),
  /** Counts of people: public 1–4 shown as "fewer than 5". */
  suppress: z.boolean(),
  /** Adds to "people served". */
  served: z.boolean(),
  note: I18nText.nullable(),
  icon: z.string(),
  version: Version,
});
export type KpiDefinition = z.infer<typeof KpiDefinition>;

/** PATCH /admin/settings/kpis/:key → KpiDefinition. */
export const KpiDefinitionPatch = z
  .object({
    label: I18nInput(120).optional(),
    formula: I18nOptionalInput(400).optional(),
    publicImpact: z.boolean().optional(),
    note: I18nOptionalInput(300).nullable().optional(),
    icon: Text(48).min(1).optional(),
    version: Version,
  })
  .strict();
export type KpiDefinitionPatch = z.infer<typeof KpiDefinitionPatch>;

/** UI string from `messages/{en,hi}.json` with DB overrides (`ui_string`) layered on top. */
export const UiString = z.object({
  key: z.string(),
  en: z.string(),
  hi: z.string().nullable(),
  /** Differs from the shipped messages file. */
  overridden: z.boolean(),
});
export type UiString = z.infer<typeof UiString>;

export const UiStringsQuery = Pagination.extend({
  q: opt(Text(120)),
  missing: opt(QueryBool),
  /** Top-level namespace (`admin`, `home`, …). */
  ns: opt(Text(40)),
});
export type UiStringsQuery = z.infer<typeof UiStringsQuery>;

/** PATCH /admin/settings/strings → UiString. `null` resets that language to the shipped text. ICU placeholders must match the English ones (422). */
export const UiStringPatch = z.object({ key: Text(200).min(1), en: Text(2000).nullable().optional(), hi: Text(2000).nullable().optional() });
export type UiStringPatch = z.infer<typeof UiStringPatch>;

export const LinkDefaults = z.object({
  /** Report link expiry = event end + N days. */
  reportLinkDays: Int.min(1).max(60),
  deskLink: z.enum(["event_day", "event_day_plus_1"]),
  otpMaxAttempts: Int.min(3).max(10),
  otpLockMinutes: Int.min(5).max(60),
});
export type LinkDefaults = z.infer<typeof LinkDefaults>;
export const LINK_DEFAULTS: LinkDefaults = { reportLinkDays: 14, deskLink: "event_day", otpMaxAttempts: 5, otpLockMinutes: 10 };

export const EscalationSettings = z.object({ approvalDays: Int.min(1).max(14) });
export type EscalationSettings = z.infer<typeof EscalationSettings>;
export const ESCALATION_DEFAULTS: EscalationSettings = { approvalDays: 3 };

export const AnalyticsStatus = z.object({
  provider: z.enum(["none", "cookieless"]),
  enabled: z.boolean(),
  lastEventAt: ISODateTime.nullable(),
});
export type AnalyticsStatus = z.infer<typeof AnalyticsStatus>;

/** GET /admin/settings — flags, link defaults, escalation, analytics (seva types/KPIs/strings have their own lists). */
export const SettingsPayload = z.object({
  flags: z.object({ discourses: z.boolean(), offline_mode: z.boolean(), ai_extraction: z.boolean() }),
  links: LinkDefaults,
  escalation: EscalationSettings,
  analytics: AnalyticsStatus,
  version: Version,
});
export type SettingsPayload = z.infer<typeof SettingsPayload>;

/** PATCH /admin/settings → SettingsPayload. Applies to new links / future escalations only. */
export const SettingsPatch = z.object({
  flags: z.object({ discourses: z.boolean(), offline_mode: z.boolean(), ai_extraction: z.boolean() }).partial().optional(),
  links: LinkDefaults.partial().optional(),
  escalation: EscalationSettings.partial().optional(),
  version: Version,
});
export type SettingsPatch = z.infer<typeof SettingsPatch>;
