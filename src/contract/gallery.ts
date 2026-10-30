import { z } from "zod";
import { blankToUndefined } from "./queries";
import { I18nText, ISODate, ISODateTime, PageMeta } from "./primitives";

/** v0.9.5. Where an album comes from. `album` = portal album without an event; `highlights` = legacy home slider images. */
export const GalleryKind = z.enum(["album", "news", "event", "centre", "highlights"]);
export type GalleryKind = z.infer<typeof GalleryKind>;

export const GalleryPhoto = z.object({
  src: z.string(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  alt: I18nText,
  caption: I18nText.nullable().optional(),
});
export type GalleryPhoto = z.infer<typeof GalleryPhoto>;

export const GalleryAlbum = z.object({
  /** Article slug; `event-<id>`, `centre-<slug>`, or `highlights`. */
  slug: z.string(),
  title: I18nText,
  date: ISODateTime,
  kind: GalleryKind,
  cover: GalleryPhoto,
  count: z.number().int().positive(),
  /** Source page (article, event or centre; null for highlights). */
  href: z.string().nullable(),
});
export type GalleryAlbum = z.infer<typeof GalleryAlbum>;

export const GalleryAlbumDetail = GalleryAlbum.extend({ photos: z.array(GalleryPhoto).min(1) });
export type GalleryAlbumDetail = z.infer<typeof GalleryAlbumDetail>;

export const GalleryQuery = z.object({
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(48).default(12)),
  year: z.preprocess(blankToUndefined, z.coerce.number().int().min(2000).max(2100).optional()),
  kind: z.preprocess(blankToUndefined, GalleryKind.optional()),
});
export type GalleryQuery = z.infer<typeof GalleryQuery>;

/** Unfiltered filter options (year newest first, kinds that have albums). */
export const GalleryFacets = z.object({
  years: z.array(z.number().int()),
  kinds: z.array(z.object({ kind: GalleryKind, count: z.number().int().nonnegative() })),
});
export type GalleryFacets = z.infer<typeof GalleryFacets>;

/** GET /gallery → `{ data, meta, facets }` (facets is an additive top-level key). */
export type GalleryPage = { data: GalleryAlbum[]; meta: PageMeta; facets: GalleryFacets };

// ---- Portal: albums, photos, review, editor (v0.9.5) -------------------------
// Photos arrive from WhatsApp (coordinators only) or a portal upload and land as
// `pending`. A reviewer approves (published to public media, EXIF/GPS stripped),
// edits (new derived file; the original is kept privately) or rejects. Nothing is
// public until the photo is approved AND its album is published.

const GText = (max: number) => z.string().trim().max(max);
const GVersion = z.number().int().positive();

/** `pending` = waiting for review; `approved` = public once its album is published; `rejected` = hidden (file kept for retention). */
export const GalleryPhotoStatus = z.enum(["pending", "approved", "rejected"]);
export type GalleryPhotoStatus = z.infer<typeof GalleryPhotoStatus>;
export const GalleryPhotoSource = z.enum(["whatsapp", "portal"]);
export type GalleryPhotoSource = z.infer<typeof GalleryPhotoSource>;
export const GalleryAlbumStatus = z.enum(["draft", "published"]);
export type GalleryAlbumStatus = z.infer<typeof GalleryAlbumStatus>;

/** Crop presets offered by the editor (`free` = any ratio). */
export const CROP_ASPECTS = ["free", "1:1", "4:3", "3:2", "16:9", "4:5"] as const;
export const CropAspect = z.enum(CROP_ASPECTS);
export type CropAspect = z.infer<typeof CropAspect>;

const Unit = z.number().min(0).max(1);
/**
 * Non-destructive edit recipe, applied server-side to the ORIGINAL in this order:
 * EXIF auto-orient → rotate (clockwise) → flip → crop (fractions of the rotated+flipped
 * image) → brightness/contrast. Output: JPEG, max 2400 px long edge, metadata stripped.
 */
export const PhotoEdits = z
  .object({
    rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).default(0),
    flipH: z.boolean().default(false),
    flipV: z.boolean().default(false),
    crop: z.object({ x: Unit, y: Unit, w: z.number().gt(0).max(1), h: z.number().gt(0).max(1), aspect: CropAspect.default("free") }).nullable().default(null),
    /** -100…100, 0 = unchanged. */
    brightness: z.number().int().min(-100).max(100).default(0),
    contrast: z.number().int().min(-100).max(100).default(0),
  })
  .refine((e) => !e.crop || (e.crop.x + e.crop.w <= 1.0001 && e.crop.y + e.crop.h <= 1.0001), { message: "Crop is outside the image", path: ["crop"] });
export type PhotoEdits = z.infer<typeof PhotoEdits>;

export const GalleryAlbumRef = z.object({ id: z.string(), title: I18nText, status: GalleryAlbumStatus });
export type GalleryAlbumRef = z.infer<typeof GalleryAlbumRef>;

/** One photo in the portal. `previewUrl`/`originalUrl` are authenticated admin URLs (EXIF stripped on the fly). */
export const AdminGalleryPhoto = z.object({
  id: z.string(),
  status: GalleryPhotoStatus,
  source: GalleryPhotoSource,
  album: GalleryAlbumRef.nullable(),
  /** Event the sender picked / matched (album may be created from it). */
  event: z.object({ id: z.string(), title: I18nText, startsAt: ISODateTime }).nullable(),
  caption: I18nText,
  alt: I18nText,
  /** Current rendering (derived when edited, else the original), resized for review. */
  previewUrl: z.string(),
  /** Unedited original (stripped of metadata), for the editor. */
  originalUrl: z.string(),
  /** Public URL once approved (null while pending/rejected). */
  publicUrl: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  bytes: z.number().int().nonnegative(),
  edits: PhotoEdits.nullable(),
  /** Number of saved edits (derived files); 0 = original. */
  revision: z.number().int().nonnegative(),
  isCover: z.boolean(),
  /** "+91 ••••• •4321" for WhatsApp, uploader name for portal. */
  from: z.string(),
  receivedAt: ISODateTime,
  reviewedBy: z.string().nullable(),
  reviewedAt: ISODateTime.nullable(),
  rejectReason: z.string().nullable(),
  version: GVersion,
  can: z.object({ review: z.boolean(), edit: z.boolean() }),
});
export type AdminGalleryPhoto = z.infer<typeof AdminGalleryPhoto>;

export const AdminGalleryAlbum = z.object({
  id: z.string(),
  slug: z.string(),
  title: I18nText,
  description: I18nText,
  date: ISODate,
  status: GalleryAlbumStatus,
  event: z.object({ id: z.string(), title: I18nText }).nullable(),
  scope: z.object({ id: z.string(), name: I18nText }).nullable(),
  coverPhotoId: z.string().nullable(),
  coverUrl: z.string().nullable(),
  counts: z.object({ pending: z.number().int().nonnegative(), approved: z.number().int().nonnegative(), rejected: z.number().int().nonnegative() }),
  publicUrl: z.string().nullable(),
  version: GVersion,
  updatedAt: ISODateTime,
});
export type AdminGalleryAlbum = z.infer<typeof AdminGalleryAlbum>;

/** GET /admin/gallery/albums/:id → album + its photos (all statuses, `order` order). */
export const AdminGalleryAlbumDetail = AdminGalleryAlbum.extend({ photos: z.array(AdminGalleryPhoto) });
export type AdminGalleryAlbumDetail = z.infer<typeof AdminGalleryAlbumDetail>;

/** GET /admin/gallery/photos?status&albumId&page&pageSize → list envelope, `meta.counts` {pending, approved, rejected}. `albumId=none` = not in an album. */
export const AdminGalleryPhotosQuery = z.object({
  status: z.preprocess(blankToUndefined, GalleryPhotoStatus.default("pending")),
  albumId: z.preprocess(blankToUndefined, z.string().max(64).optional()),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(60).default(24)),
});
export type AdminGalleryPhotosQuery = z.infer<typeof AdminGalleryPhotosQuery>;

/** GET /admin/gallery/albums?status&page&pageSize → list envelope of AdminGalleryAlbum (scoped, newest date first). */
export const AdminGalleryAlbumsQuery = z.object({
  status: z.preprocess(blankToUndefined, GalleryAlbumStatus.optional()),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(60).default(24)),
});
export type AdminGalleryAlbumsQuery = z.infer<typeof AdminGalleryAlbumsQuery>;

const BiInput = (max: number) => z.object({ en: GText(max).min(1), hi: GText(max).nullable().default(null) });
const BiOptional = (max: number) => z.object({ en: GText(max), hi: GText(max).nullable().default(null) });

/** POST /admin/gallery/albums → 201 AdminGalleryAlbum. `eventId` links an event (title/date default from it). Scope: event's samithi, else `scopeId`, else actor scope. */
export const GalleryAlbumCreate = z.object({
  title: BiInput(160).optional(),
  description: BiOptional(1000).default({ en: "", hi: null }),
  date: ISODate.optional(),
  eventId: z.string().max(64).nullable().default(null),
  scopeId: z.string().max(64).nullable().default(null),
});
export type GalleryAlbumCreate = z.infer<typeof GalleryAlbumCreate>;

/** PATCH /admin/gallery/albums/:id → AdminGalleryAlbum. Publishing needs `gallery.review` and ≥1 approved photo (422 `fields.status`). `photoOrder` = full list of the album's photo ids. */
export const GalleryAlbumPatch = z.object({
  version: GVersion,
  title: BiInput(160).optional(),
  description: BiOptional(1000).optional(),
  date: ISODate.optional(),
  status: GalleryAlbumStatus.optional(),
  coverPhotoId: z.string().max(64).nullable().optional(),
  photoOrder: z.array(z.string().max(64)).max(500).optional(),
});
export type GalleryAlbumPatch = z.infer<typeof GalleryAlbumPatch>;

/** PATCH /admin/gallery/photos/:id → AdminGalleryPhoto. Captions/alt/album; `setCover` makes it its album's cover (needs an approved photo in an album). */
export const GalleryPhotoPatch = z.object({
  version: GVersion,
  caption: BiOptional(300).optional(),
  alt: BiOptional(200).optional(),
  albumId: z.string().max(64).nullable().optional(),
  setCover: z.boolean().optional(),
});
export type GalleryPhotoPatch = z.infer<typeof GalleryPhotoPatch>;

/** POST /admin/gallery/photos/:id/edit → AdminGalleryPhoto. Renders a NEW derived file from the original (revision+1); `edits: null` = back to the original. Approved photos are republished. */
export const GalleryPhotoEditBody = z.object({
  version: GVersion,
  edits: PhotoEdits.nullable(),
  caption: BiOptional(300).optional(),
  alt: BiOptional(200).optional(),
  setCover: z.boolean().optional(),
});
export type GalleryPhotoEditBody = z.infer<typeof GalleryPhotoEditBody>;

/** POST /admin/gallery/photos/:id/approve (`gallery.review`). `albumId` required when the photo has none (422 `fields.albumId`). */
export const GalleryPhotoApproveBody = z.object({ version: GVersion, albumId: z.string().max(64).optional() });
export type GalleryPhotoApproveBody = z.infer<typeof GalleryPhotoApproveBody>;

/** POST /admin/gallery/photos/:id/reject (`gallery.review`). Removes the public file if it was approved. */
export const GalleryPhotoRejectBody = z.object({ version: GVersion, reason: GText(300).min(1) });
export type GalleryPhotoRejectBody = z.infer<typeof GalleryPhotoRejectBody>;

/** POST /admin/gallery/photos/bulk → {done: string[], failed: {id, code}[]}. */
export const GalleryPhotoBulkBody = z.object({
  action: z.enum(["approve", "reject"]),
  ids: z.array(z.string().max(64)).min(1).max(100),
  albumId: z.string().max(64).optional(),
  reason: GText(300).optional(),
});
export type GalleryPhotoBulkBody = z.infer<typeof GalleryPhotoBulkBody>;

/** POST /admin/gallery/photos (multipart `file` + `albumId?` + `caption?`) → 201 AdminGalleryPhoto (pending). */
export const GalleryUploadForm = z.object({ albumId: z.string().max(64).optional(), caption: GText(300).optional() });
export type GalleryUploadForm = z.infer<typeof GalleryUploadForm>;

/** Image intake limits (WhatsApp + portal). MIME is sniffed from bytes, never trusted from the sender. */
export const GALLERY_LIMITS = { bytes: 10 * 1024 * 1024, mimes: ["image/jpeg", "image/png", "image/webp"] as const, maxEdge: 2400, previewEdge: 1200 };

/** GET /admin/gallery/photos/:id/file?variant=preview|original[&rev=n] → image/jpeg bytes (`Cache-Control: private, no-store`). `rev` only busts caches. */
export const GalleryFileQuery = z.object({ variant: z.enum(["preview", "original"]).default("preview"), rev: z.string().max(10).optional() });
export type GalleryFileQuery = z.infer<typeof GalleryFileQuery>;
