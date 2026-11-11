/** Provider-side processing state of one video. */
export type RemoteState = "uploading" | "processing" | "ready" | "error";

export interface RemoteVideo {
  state: RemoteState;
  durationS: number | null;
  /** Provider reason code when `state` is `error`. */
  errorReason: string | null;
}

export interface CreateUploadInput {
  name: string;
  sizeBytes: number;
  maxDurationS: number;
}

export interface CreateUploadResult {
  /** Provider video id. */
  uid: string;
  /** One-time resumable (tus) URL the browser uploads to. */
  uploadUrl: string;
}

/** Parsed provider webhook (already signature-checked). */
export interface VideoWebhookEvent extends RemoteVideo {
  uid: string;
}

/**
 * Video hosting. Failures throw ApiError PROVIDER_UNAVAILABLE. The browser only ever sees the
 * one-time `uploadUrl`; API tokens stay on the server.
 */
export interface VideoProvider {
  readonly kind: "cloudflare" | "mock";
  createUpload(input: CreateUploadInput): Promise<CreateUploadResult>;
  getVideo(uid: string): Promise<RemoteVideo | null>;
  /** WebVTT text. */
  uploadCaptions(uid: string, lang: string, vtt: string): Promise<void>;
  deleteVideo(uid: string): Promise<void>;
  /** Player URL (no query); "" when the provider has no player (mock). */
  iframeUrl(uid: string): string;
  /** Still frame at `timeS` (default: provider's choice). */
  posterUrl(uid: string, timeS?: number | null): string;
  /** `true` only for a genuine, fresh delivery. */
  verifyWebhook(rawBody: string, header: string | null, nowMs?: number): boolean;
  /** Body of a verified delivery -> event; null when not a video status payload. */
  parseWebhook(rawBody: string): VideoWebhookEvent | null;
}
