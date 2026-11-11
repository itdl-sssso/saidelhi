// v0.11 video library (Cloudflare Stream): portal DTOs and bodies. Permission `content.edit`.
// Upload flow: POST /admin/videos -> {uploadUrl} -> browser uploads with tus straight to Cloudflare
// (the API token never leaves the server) -> webhook / GET refresh marks the video ready.
import { z } from "zod";
import { I18nText, ISODateTime, Id } from "./primitives";
import { Pagination } from "./queries";

export const VideoStatus = z.enum(["uploading", "processing", "ready", "error"]);
export type VideoStatus = z.infer<typeof VideoStatus>;

export const VideoCaptionLang = z.enum(["hi", "en"]);
export type VideoCaptionLang = z.infer<typeof VideoCaptionLang>;

export const VIDEO_LIMITS = {
  /** Largest file accepted (bytes). */
  maxBytes: 4 * 1024 * 1024 * 1024,
  /** Stream maxDurationSeconds for direct uploads. */
  maxDurationS: 3 * 60 * 60,
  /** tus chunk size (Cloudflare needs a multiple of 256 KiB; min 5 MiB). */
  chunkBytes: 50 * 1024 * 1024,
  /** Caption file cap (Cloudflare allows 10 MB). */
  captionBytes: 2 * 1024 * 1024,
} as const;

export const VideoCaption = z.object({ lang: VideoCaptionLang, label: z.string() });
export type VideoCaption = z.infer<typeof VideoCaption>;

/** Library row. `uploadUrl` is only present in the POST response (one-time tus URL). */
export const AdminVideo = z.object({
  id: Id,
  provider: z.enum(["cloudflare", "mock"]),
  title: I18nText,
  status: VideoStatus,
  durationS: z.number().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  captions: z.array(VideoCaption),
  posterTimeS: z.number().nullable(),
  /** Poster image (null until the provider has a frame). */
  posterUrl: z.string().nullable(),
  /** Player URL for the admin preview; null while not ready (and for the mock provider). */
  iframeUrl: z.string().nullable(),
  errorReason: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: ISODateTime,
  updatedAt: ISODateTime,
  version: z.number().int().positive(),
  uploadUrl: z.string().optional(),
});
export type AdminVideo = z.infer<typeof AdminVideo>;

const Title = z.object({ en: z.string().trim().min(1).max(200), hi: z.string().trim().max(200).nullable().default(null) });

/** POST /admin/videos -> 201 AdminVideo (with `uploadUrl`). */
export const VideoCreate = z.object({
  title: Title,
  fileName: z.string().trim().max(255).default("video"),
  sizeBytes: z.number().int().positive().max(VIDEO_LIMITS.maxBytes),
});
export type VideoCreate = z.infer<typeof VideoCreate>;

/** PATCH /admin/videos/:id -> AdminVideo. `version` required (409 when stale). */
export const VideoPatch = z.object({
  version: z.number().int().positive(),
  title: Title.optional(),
  posterTimeS: z.number().min(0).max(VIDEO_LIMITS.maxDurationS).nullable().optional(),
});
export type VideoPatch = z.infer<typeof VideoPatch>;

/** GET /admin/videos query. `ready=1` = picker (ready only). */
export const AdminVideosQuery = Pagination.extend({
  ready: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["1", "0"]).optional()),
});
export type AdminVideosQuery = z.infer<typeof AdminVideosQuery>;

/** POST /admin/videos/:id/captions multipart: `file` (.srt/.vtt) + `lang`. */
export const VideoCaptionForm = z.object({ lang: VideoCaptionLang });
export type VideoCaptionForm = z.infer<typeof VideoCaptionForm>;
