// Dev/test video provider: nothing leaves the machine. The upload URL points at the dev-only tus
// endpoint (/api/v1/dev/video-upload/:uid) which discards the bytes and marks the video ready.
import { API_BASE } from "@/contract";
import type { CreateUploadInput, CreateUploadResult, RemoteVideo, VideoProvider, VideoWebhookEvent } from "./types";

interface MockEntry {
  length: number;
  offset: number;
  state: RemoteVideo["state"];
  durationS: number | null;
  captions: Record<string, string>;
}

// globalThis so dev HMR and separate route bundles share one table.
const KEY = Symbol.for("saidelhi.mockVideos");
const table = (): Map<string, MockEntry> => {
  const g = globalThis as unknown as Record<symbol, Map<string, MockEntry> | undefined>;
  return (g[KEY] ??= new Map());
};

export const MOCK_WEBHOOK_HEADER = "mock-signature";
export const MOCK_POSTER = "/video-placeholder.svg";

/** Tus state used by the dev upload route. */
export const mockUploads = {
  get: (uid: string) => table().get(uid) ?? null,
  /** Adds received bytes; the video turns ready once all of them arrived. */
  receive(uid: string, bytes: number): MockEntry | null {
    const e = table().get(uid);
    if (!e) return null;
    e.offset = Math.min(e.length, e.offset + bytes);
    if (e.offset >= e.length) {
      e.state = "ready";
      e.durationS = e.durationS ?? 1800;
    }
    return e;
  },
};

export class MockVideo implements VideoProvider {
  readonly kind = "mock" as const;
  private n = 0;

  async createUpload(i: CreateUploadInput): Promise<CreateUploadResult> {
    const uid = `mock${Date.now().toString(36)}${(this.n++).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    table().set(uid, { length: i.sizeBytes, offset: 0, state: "uploading", durationS: null, captions: {} });
    return { uid, uploadUrl: `${API_BASE}/dev/video-upload/${uid}` };
  }

  async getVideo(uid: string): Promise<RemoteVideo | null> {
    const e = table().get(uid);
    // Unknown after a dev-server restart: treat as ready so the library does not hang.
    return e ? { state: e.state, durationS: e.durationS, errorReason: null } : { state: "ready", durationS: null, errorReason: null };
  }

  async uploadCaptions(uid: string, lang: string, vtt: string): Promise<void> {
    const e = table().get(uid);
    if (e) e.captions[lang] = vtt;
  }

  async deleteVideo(uid: string): Promise<void> {
    table().delete(uid);
  }

  iframeUrl(): string {
    return "";
  }

  posterUrl(): string {
    return MOCK_POSTER;
  }

  verifyWebhook(_raw: string, header: string | null): boolean {
    // The fixed mock header must never authenticate a production webhook.
    return process.env.NODE_ENV !== "production" && header === MOCK_WEBHOOK_HEADER;
  }

  parseWebhook(raw: string): VideoWebhookEvent | null {
    try {
      const j = JSON.parse(raw) as { uid?: string; state?: RemoteVideo["state"]; duration?: number; errorReason?: string };
      return j.uid ? { uid: j.uid, state: j.state ?? "ready", durationS: j.duration ?? null, errorReason: j.errorReason ?? null } : null;
    } catch {
      return null;
    }
  }
}
