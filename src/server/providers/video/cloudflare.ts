// Cloudflare Stream adapter (docs: developers.cloudflare.com/stream). Direct creator uploads use
// tus: the server asks for an upload slot with `POST /accounts/:id/stream?direct_user=true`
// (Authorization = API token, Upload-Length + Upload-Metadata) and hands the returned one-time
// `Location` to the browser.
import { createHmac } from "node:crypto";
import { ApiError } from "../../http/errors";
import { safeEqual } from "../../security/crypto";
import type { CreateUploadInput, CreateUploadResult, RemoteVideo, VideoProvider, VideoWebhookEvent } from "./types";

const API = "https://api.cloudflare.com/client/v4";
/** Webhook deliveries older than this are refused (replay guard). */
export const WEBHOOK_TOLERANCE_S = 5 * 60;

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  customerCode: string;
  webhookSecret: string;
  fetch?: typeof fetch;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unavailable = (message: string) => new ApiError("PROVIDER_UNAVAILABLE", { message });

export class CloudflareStream implements VideoProvider {
  readonly kind = "cloudflare" as const;
  private readonly f: typeof fetch;

  constructor(private readonly c: CloudflareConfig) {
    this.f = c.fetch ?? fetch;
  }

  private get host() {
    return `https://customer-${this.c.customerCode}.cloudflarestream.com`;
  }
  private auth() {
    return { Authorization: `Bearer ${this.c.apiToken}` };
  }

  async createUpload(i: CreateUploadInput): Promise<CreateUploadResult> {
    const meta = [`maxDurationSeconds ${b64(String(i.maxDurationS))}`, `name ${b64(i.name.slice(0, 120))}`].join(",");
    const res = await this.f(`${API}/accounts/${this.c.accountId}/stream?direct_user=true`, {
      method: "POST",
      headers: { ...this.auth(), "Tus-Resumable": "1.0.0", "Upload-Length": String(i.sizeBytes), "Upload-Metadata": meta },
    });
    if (!res.ok) throw unavailable(`Video upload could not be started (${res.status}).`);
    const location = res.headers.get("location");
    if (!location) throw unavailable("Video upload could not be started.");
    // `stream-media-id` carries the video uid; fall back to the Location path (…/<uid>?tusv2=true).
    const uid = res.headers.get("stream-media-id") ?? new URL(location, "https://upload.cloudflarestream.com").pathname.split("/").filter(Boolean).pop();
    if (!uid) throw unavailable("Video upload could not be started.");
    return { uid, uploadUrl: location };
  }

  async getVideo(uid: string): Promise<RemoteVideo | null> {
    const res = await this.f(`${API}/accounts/${this.c.accountId}/stream/${encodeURIComponent(uid)}`, { headers: this.auth() });
    if (res.status === 404) return null;
    if (!res.ok) throw unavailable(`Video status unavailable (${res.status}).`);
    const body = (await res.json()) as { result?: unknown };
    return remoteOf(body.result);
  }

  async uploadCaptions(uid: string, lang: string, vtt: string): Promise<void> {
    const form = new FormData();
    form.set("file", new Blob([vtt], { type: "text/vtt" }), `${lang}.vtt`);
    const res = await this.f(`${API}/accounts/${this.c.accountId}/stream/${encodeURIComponent(uid)}/captions/${encodeURIComponent(lang)}`, { method: "PUT", headers: this.auth(), body: form });
    if (!res.ok) throw unavailable(`Captions could not be saved (${res.status}).`);
  }

  async deleteVideo(uid: string): Promise<void> {
    const res = await this.f(`${API}/accounts/${this.c.accountId}/stream/${encodeURIComponent(uid)}`, { method: "DELETE", headers: this.auth() });
    if (!res.ok && res.status !== 404) throw unavailable(`Video could not be deleted (${res.status}).`);
  }

  iframeUrl(uid: string): string {
    return `${this.host}/${encodeURIComponent(uid)}/iframe`;
  }

  posterUrl(uid: string, timeS?: number | null): string {
    const q = new URLSearchParams({ height: "720" });
    if (timeS && timeS > 0) q.set("time", `${Math.floor(timeS)}s`);
    return `${this.host}/${encodeURIComponent(uid)}/thumbnails/thumbnail.jpg?${q}`;
  }

  verifyWebhook(rawBody: string, header: string | null, nowMs: number = Date.now()): boolean {
    return verifyStreamSignature(rawBody, header, this.c.webhookSecret, nowMs);
  }

  parseWebhook(rawBody: string): VideoWebhookEvent | null {
    let j: unknown;
    try {
      j = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!j || typeof j !== "object" || typeof (j as { uid?: unknown }).uid !== "string") return null;
    return { uid: (j as { uid: string }).uid, ...remoteOf(j) };
  }
}

/** Cloudflare video object -> our state. `readyToStream` + `status.state=ready` = playable. */
function remoteOf(v: unknown): RemoteVideo {
  const o = (v ?? {}) as { readyToStream?: boolean; duration?: number; status?: { state?: string; errorReasonCode?: string; errReasonCode?: string } };
  const st = o.status?.state ?? "";
  const dur = typeof o.duration === "number" && o.duration > 0 ? o.duration : null;
  if (st === "error") return { state: "error", durationS: dur, errorReason: o.status?.errorReasonCode ?? o.status?.errReasonCode ?? "ERR_UNKNOWN" };
  if (st === "ready" && o.readyToStream) return { state: "ready", durationS: dur, errorReason: null };
  if (st === "pendingupload" || st === "downloading") return { state: "uploading", durationS: dur, errorReason: null };
  return { state: "processing", durationS: dur, errorReason: null };
}

/**
 * `Webhook-Signature: time=<unix>,sig1=<hex>`; sig1 = HMAC-SHA256(secret, `${time}.${rawBody}`).
 * Constant-time compare; deliveries outside the tolerance window are refused.
 */
export function verifyStreamSignature(rawBody: string, header: string | null, secret: string, nowMs: number = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = new Map<string, string>();
  for (const kv of header.split(",")) {
    const i = kv.indexOf("=");
    if (i > 0) parts.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
  }
  const time = parts.get("time");
  const sig = parts.get("sig1");
  if (!time || !sig || !/^\d+$/.test(time)) return false;
  if (Math.abs(nowMs / 1000 - Number(time)) > WEBHOOK_TOLERANCE_S) return false;
  const expected = createHmac("sha256", secret).update(`${time}.${rawBody}`).digest("hex");
  return safeEqual(sig, expected);
}

/** Test helper: header for a body. */
export function signStreamWebhook(rawBody: string, secret: string, timeS: number): string {
  return `time=${timeS},sig1=${createHmac("sha256", secret).update(`${timeS}.${rawBody}`).digest("hex")}`;
}
