// Maps the offline media index (`media/index.json`: audio from the Sri Sathya Sai Media Centre,
// YouTube candidates) to `discourse_media` rows. Pure: no fs, no DB. URLs only; nothing is downloaded.
import { z } from "zod";

const Audio = z.object({ date: z.string().nullish(), heading: z.string().nullish(), page: z.string().nullish(), audio: z.string().min(1) });
const Video = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  duration_s: z.number().nullish(),
  channel: z.string().nullish(),
  url: z.string().nullish(),
  score: z.number().nullish(),
  confidence: z.string().nullish(),
  official: z.boolean().default(false),
});
export const MediaIndexEntry = z.object({ n: z.number().int(), status: z.string().optional(), audio: z.array(Audio).default([]), videos: z.array(Video).default([]) });
export const MediaIndex = z.array(MediaIndexEntry);
export type MediaIndexEntry = z.infer<typeof MediaIndexEntry>;

export interface ImportedMedia {
  kind: "audio" | "video";
  provider: "radiosai" | "youtube";
  url: string;
  externalId: string | null;
  title: string;
  channel: string | null;
  durationS: number | null;
  recordedDate: string | null;
  official: boolean;
  confidence: "high" | "medium" | "low" | null;
  score: number | null;
  sourcePage: string | null;
  /** Default on first import: official audio and high-confidence video are approved, the rest wait for a coordinator. */
  approved: boolean;
  sort: number;
}

const http = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null);
const conf = (c: string | null | undefined): ImportedMedia["confidence"] => (c === "high" || c === "medium" || c === "low" ? c : null);

/** Audio first (index order), then video by score desc. Dedupes by URL; skips non-http URLs. */
export function mediaForEntry(e: MediaIndexEntry): ImportedMedia[] {
  const out: ImportedMedia[] = [];
  const seen = new Set<string>();
  for (const a of e.audio) {
    const url = http(a.audio);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      kind: "audio",
      provider: "radiosai",
      url,
      externalId: null,
      title: (a.heading ?? "").trim().slice(0, 300),
      channel: null,
      durationS: null,
      recordedDate: a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : null,
      official: true,
      confidence: null,
      score: null,
      sourcePage: http(a.page),
      approved: true,
      sort: 0,
    });
  }
  const vids = [...e.videos].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  for (const v of vids) {
    if (!/^[\w-]{6,20}$/.test(v.id)) continue;
    const url = http(v.url) ?? `https://www.youtube.com/watch?v=${v.id}`;
    if (seen.has(url)) continue;
    seen.add(url);
    const c = conf(v.confidence);
    out.push({
      kind: "video",
      provider: "youtube",
      url,
      externalId: v.id,
      title: v.title.trim().slice(0, 300),
      channel: v.channel?.trim().slice(0, 200) || null,
      durationS: v.duration_s != null ? Math.round(v.duration_s) : null,
      recordedDate: null,
      official: v.official,
      confidence: c,
      score: v.score != null ? Math.round(v.score) : null,
      sourcePage: null,
      approved: c === "high",
      sort: 0,
    });
  }
  return out.map((m, i) => ({ ...m, sort: i }));
}
