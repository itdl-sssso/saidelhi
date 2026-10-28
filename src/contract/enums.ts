import { z } from "zod";

export const EventStatus = z.enum([
  "draft",
  "awaiting_approval",
  "planned",
  "awaiting_report",
  "report_submitted",
  "approved",
  "cancelled",
  "postponed",
  "escalated",
]);
export type EventStatus = z.infer<typeof EventStatus>;

/** Statuses visible on public pages (spec 09: "Planned or later", excluding escalated). */
export const PublicEventStatus = z.enum([
  "planned",
  "awaiting_report",
  "report_submitted",
  "approved",
  "cancelled",
  "postponed",
]);
export type PublicEventStatus = z.infer<typeof PublicEventStatus>;
export const PUBLIC_EVENT_STATUSES = PublicEventStatus.options;

/** Extensible via settings; these are the built-in codes. */
export const SevaType = z.enum([
  "eye",
  "blood",
  "medical",
  "narayan_seva",
  "bal_vikas",
  "bhajan",
  "study_circle",
  "disaster_relief",
  "cleanliness",
  "other",
]);
export type SevaType = z.infer<typeof SevaType>;

export const Wing = z.enum(["service", "educational", "spiritual", "mahila", "youth"]);
export type Wing = z.infer<typeof Wing>;

export const LinkPurpose = z.enum(["report", "desk", "public"]);
export type LinkPurpose = z.infer<typeof LinkPurpose>;

export const LinkState = z.enum(["active", "expired", "revoked", "used_up"]);
export type LinkState = z.infer<typeof LinkState>;

export const Source = z.enum(["form", "upload", "whatsapp", "scan", "portal"]);
export type Source = z.infer<typeof Source>;

export const Confidence = z.enum(["high", "check", "low"]);
export type Confidence = z.infer<typeof Confidence>;

/** Legacy letters map positionally: N,A,C,D,K,S,P. */
export const ArticleCategory = z.enum([
  "news",
  "activities",
  "centenary_national",
  "centenary_state",
  "key_programs",
  "special_programs",
  "stories",
]);
export type ArticleCategory = z.infer<typeof ArticleCategory>;
/** Legacy posts and the seven original types. */
export const BuiltinArticleCategory = ArticleCategory;
export type BuiltinArticleCategory = ArticleCategory;

/**
 * v0.10: an article TYPE is a slug from the admin-managed `content_type` list (GET /admin/content/types).
 * The seven built-ins keep their slugs (legacy posts map onto them); state admins add more.
 * `Article.category` stays one of the built-ins (custom types report their nearest built-in, `news`),
 * the real type is `Article.type`.
 */
export const ContentTypeSlug = z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/, "Use lowercase letters, digits, - or _");
export type ContentTypeSlug = z.infer<typeof ContentTypeSlug>;
export const isBuiltinCategory = (s: string): s is ArticleCategory => ArticleCategory.safeParse(s).success;

export const LEGACY_ARTICLE_CATEGORY = {
  N: "news",
  A: "activities",
  C: "centenary_national",
  D: "centenary_state",
  K: "key_programs",
  S: "special_programs",
  P: "stories",
} as const satisfies Record<string, BuiltinArticleCategory>;
export type LegacyArticleCategory = keyof typeof LEGACY_ARTICLE_CATEGORY;

/** `?c=` filter on /articles: a category, the `centenary` group (both centenary_*), or `all`. */
export const ArticleCategoryFilter = z.union([ContentTypeSlug, z.enum(["all", "centenary"])]);
export type ArticleCategoryFilter = z.infer<typeof ArticleCategoryFilter>;

export const Role = z.enum([
  "state_admin",
  "district_coord",
  "samithi_coord",
  "content_editor",
  "translator",
  "pii_officer",
]);
export type Role = z.infer<typeof Role>;

export const OrgUnitKind = z.enum(["ncr", "district", "samithi"]);
export type OrgUnitKind = z.infer<typeof OrgUnitKind>;

export const GatheringKind = z.enum(["bhajan", "study_circle", "bal_vikas"]);
export type GatheringKind = z.infer<typeof GatheringKind>;

export const PartnerKind = z.enum(["hospital", "blood_bank", "ngo", "school"]);
export type PartnerKind = z.infer<typeof PartnerKind>;

export const TimelineChannel = z.enum(["whatsapp", "portal", "system"]);
export type TimelineChannel = z.infer<typeof TimelineChannel>;

export const SubmissionStatus = z.enum(["submitted", "approved", "changes_requested"]);
export type SubmissionStatus = z.infer<typeof SubmissionStatus>;

export const InboxState = z.enum(["for_me", "escalated", "done"]);
export type InboxState = z.infer<typeof InboxState>;

export const FormFieldKind = z.enum([
  "number",
  "text",
  "date",
  "time",
  "select",
  "multiselect",
  "yesno",
  "repeater",
  "file",
  "heading",
  "help",
]);
export type FormFieldKind = z.infer<typeof FormFieldKind>;

/** Import maps the source `verse` blocks to `poem` (set apart in italics). */
export const DiscourseBlockType = z.enum(["para", "heading", "poem", "quote"]);
export type DiscourseBlockType = z.infer<typeof DiscourseBlockType>;

/** v0.8: the 14 research themes (spec 15). Labels in `DISCOURSE_THEMES` (contract/discourses.ts). */
export const DiscourseTheme = z.enum([
  "character",
  "education",
  "discipline",
  "ceiling_on_desires",
  "technology",
  "habits",
  "parents",
  "friendship",
  "self_confidence",
  "leadership",
  "service",
  "time",
  "career_ethics",
  "mental_peace",
]);
export type DiscourseTheme = z.infer<typeof DiscourseTheme>;

/** v0.8: workflow status of one discourse (spec 39). Only `published` is public (and only with the flag on). */
export const DiscourseStatus = z.enum(["not_started", "ai_draft", "in_review", "approved", "published"]);
export type DiscourseStatus = z.infer<typeof DiscourseStatus>;

/** v0.8: per-paragraph Hindi status. `empty` = no Hindi yet. Editing an approved block resets it to `edited`. */
export const DiscourseBlockStatus = z.enum(["empty", "ai_draft", "edited", "approved"]);
export type DiscourseBlockStatus = z.infer<typeof DiscourseBlockStatus>;

export const ImpactPeriod = z.enum(["this_year", "last_year", "all"]);
export type ImpactPeriod = z.infer<typeof ImpactPeriod>;

export const PrivacyRequestType = z.enum(["access", "correction", "deletion", "grievance"]);
export type PrivacyRequestType = z.infer<typeof PrivacyRequestType>;

export const PrivacyRequestStatus = z.enum(["received", "in_progress", "done", "rejected"]);
export type PrivacyRequestStatus = z.infer<typeof PrivacyRequestStatus>;

export const ContentKind = z.enum(["thought_for_day", "announcement", "home_section"]);
export type ContentKind = z.infer<typeof ContentKind>;

export const FeatureFlag = z.enum(["discourses", "offline_mode", "ai_extraction"]);
export type FeatureFlag = z.infer<typeof FeatureFlag>;

export const ValueSlug = z.enum(["sathya", "dharma", "shanti", "prema", "ahimsa"]);
export type ValueSlug = z.infer<typeof ValueSlug>;
