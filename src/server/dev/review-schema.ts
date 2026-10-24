// Dev-only review tracker: shared shapes (client + server). Pure, no fs.
import { z } from "zod";

export const REVIEW_STATUSES = ["not_tested", "works", "minor", "broken", "mismatch"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ROUND_RE = /^round-[1-9]\d{0,2}$/;
export const ITEM_ID_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/;
export const SHOT_RE = /^[a-z0-9][a-z0-9_-]{0,79}-\d{1,4}\.(?:png|jpg|webp)$/;
export const MAX_SHOT_BYTES = 5 * 1024 * 1024;
export const SHOT_TYPES: Record<string, "png" | "jpg" | "webp"> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export const RoundId = z.string().regex(ROUND_RE);

export const ReviewDevices = z.object({
  desktop: z.boolean().default(false),
  mobile: z.boolean().default(false),
  hindi: z.boolean().default(false),
});

export const ReviewItem = z.object({
  status: z.enum(REVIEW_STATUSES).default("not_tested"),
  devices: ReviewDevices.default({ desktop: false, mobile: false, hindi: false }),
  notes: z.string().max(10_000).default(""),
  shots: z.array(z.string().regex(SHOT_RE)).max(20).default([]),
  updatedAt: z.string().max(40).default(""),
});
export type ReviewItem = z.infer<typeof ReviewItem>;

export const GeneralNote = z.object({
  id: z.string().regex(ITEM_ID_RE),
  title: z.string().max(200).default(""),
  notes: z.string().max(10_000).default(""),
  shots: z.array(z.string().regex(SHOT_RE)).max(20).default([]),
  updatedAt: z.string().max(40).default(""),
});
export type GeneralNote = z.infer<typeof GeneralNote>;

export const ReviewDoc = z.object({
  round: RoundId,
  updatedAt: z.string().max(40).default(""),
  items: z.record(z.string().regex(ITEM_ID_RE), ReviewItem).default({}),
  general: z.array(GeneralNote).max(200).default([]),
});
export type ReviewDoc = z.infer<typeof ReviewDoc>;

/** Catalog titles sent with a save so the markdown summary can name items. */
export const TitleMapSchema = z.record(
  z.string().regex(ITEM_ID_RE),
  z.object({ title: z.string().max(200), path: z.string().max(300), group: z.string().max(60) }),
);

/** Body of PUT: the whole doc (server stamps updatedAt) plus optional titles. */
export const ReviewPut = z.object({
  doc: ReviewDoc,
  titles: TitleMapSchema.optional(),
});

export const emptyDoc = (round: string): ReviewDoc => ({ round, updatedAt: "", items: {}, general: [] });
