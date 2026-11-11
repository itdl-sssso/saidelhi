// Video library records (JSON docs in `video`, keys: k1 = provider uid, k2 = status; see repo/m6-types.ts)
// and the public resolver that turns an article's `cf:<id>` reference into a playable DTO.
import { type Article, type CloudflareVideo, type I18nText, type VideoCaption, type VideoStatus } from "@/contract";
import { MockVideo } from "../providers/video/mock";
import type { VideoProvider } from "../providers/video/types";
import type { DocRec } from "../repo/m6-types";
import type { DataRepo } from "../repo/types";

export interface VideoData {
  provider: "cloudflare" | "mock";
  providerUid: string;
  title: I18nText;
  fileName: string;
  status: VideoStatus;
  durationS: number | null;
  sizeBytes: number;
  captions: VideoCaption[];
  posterTimeS: number | null;
  errorReason: string | null;
  createdBy: string | null;
  createdById: string | null;
}

export type VideoDoc = DocRec<VideoData>;

export const videoKeys = (v: VideoData) => ({ k1: v.providerUid, k2: v.status });
export const videosOf = (repo: DataRepo) => repo.m6.docList<VideoData>("video");

/** Public DTO of a ready video; null for anything not playable. */
export function toCloudflareVideo(doc: VideoDoc, provider: VideoProvider): CloudflareVideo | null {
  const v = doc.data;
  if (v.status !== "ready") return null;
  return {
    provider: "cloudflare",
    id: doc.id,
    uid: v.providerUid,
    iframeUrl: provider.iframeUrl(v.providerUid),
    posterUrl: provider.posterUrl(v.providerUid, v.posterTimeS),
    durationS: v.durationS,
    captions: v.captions.map((c) => c.lang),
  };
}

/**
 * Replaces the unresolved `cf:` stubs on public articles with real video DTOs; videos that are
 * missing or not ready become null (never exposed). Returns the same objects, mutated.
 */
export async function resolveArticleVideos<T extends Pick<Article, "video">>(repo: DataRepo, provider: VideoProvider, articles: readonly T[]): Promise<T[]> {
  const ids = new Set<string>();
  for (const a of articles) if (a.video?.provider === "cloudflare") ids.add(a.video.id);
  if (ids.size === 0) return [...articles];
  const found = new Map<string, CloudflareVideo | null>();
  await Promise.all(
    [...ids].map(async (id) => {
      const d = await repo.m6.docGet<VideoData>("video", id);
      found.set(id, d ? toCloudflareVideo(d, provider) : null);
    }),
  );
  for (const a of articles) if (a.video?.provider === "cloudflare") a.video = found.get(a.video.id) ?? null;
  return [...articles];
}

const fallback = new MockVideo();
/** Provider for read paths (public services get an optional one in tests). */
export const videoOf = (deps: { video?: VideoProvider }): VideoProvider => deps.video ?? fallback;
