// Video library (Cloudflare Stream): upload slots, status refresh, captions, poster time, delete,
// and the provider webhook. Permission `content.edit`. Records are JSON docs (video-store.ts).
import { type AdminVideo, type AdminVideosQuery, cfVideoRef, type Paged, VIDEO_LIMITS, type VideoCreate, type VideoPatch, type VideoCaptionLang } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { toVtt } from "../../providers/video/vtt";
import type { VideoProvider } from "../../providers/video/types";
import { nativeAll } from "../native-articles";
import { type VideoData, type VideoDoc, videoKeys } from "../video-store";
import type { PortalCtx } from "./shared";

const LABEL: Record<VideoCaptionLang, string> = { hi: "हिन्दी", en: "English" };

export interface VideosAdminService {
  list(actor: Actor, q: AdminVideosQuery): Promise<Paged<AdminVideo>>;
  /** Creates the record and a one-time tus upload URL. */
  create(actor: Actor, body: VideoCreate): Promise<AdminVideo>;
  /** Refreshes the status from the provider while the video is not ready. */
  get(actor: Actor, id: string): Promise<AdminVideo>;
  patch(actor: Actor, id: string, body: VideoPatch): Promise<AdminVideo>;
  remove(actor: Actor, id: string): Promise<void>;
  addCaptions(actor: Actor, id: string, lang: VideoCaptionLang, file: { name: string; bytes: Uint8Array }): Promise<AdminVideo>;
  /** Signed provider delivery. Throws FORBIDDEN on a bad signature; unknown videos are ignored (200). */
  handleWebhook(rawBody: string, signature: string | null): Promise<void>;
}

export function createVideosAdminService(ctx: PortalCtx): VideosAdminService {
  const { repo, deps } = ctx;
  const m6 = repo.m6;
  const provider: VideoProvider = deps.video;
  const system = { kind: "system" as const };

  const dto = (d: VideoDoc, uploadUrl?: string): AdminVideo => ({
    id: d.id,
    provider: d.data.provider,
    title: d.data.title,
    status: d.data.status,
    durationS: d.data.durationS,
    sizeBytes: d.data.sizeBytes,
    captions: d.data.captions,
    posterTimeS: d.data.posterTimeS,
    posterUrl: d.data.status === "ready" ? provider.posterUrl(d.data.providerUid, d.data.posterTimeS) : null,
    iframeUrl: d.data.status === "ready" ? provider.iframeUrl(d.data.providerUid) || null : null,
    errorReason: d.data.errorReason,
    createdBy: d.data.createdBy,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    version: d.version,
    ...(uploadUrl ? { uploadUrl } : {}),
  });

  const load = async (id: string): Promise<VideoDoc> => {
    const d = await m6.docGet<VideoData>("video", id);
    if (!d) throw new ApiError("NOT_FOUND");
    return d;
  };

  async function write(doc: VideoDoc, data: VideoData, audit: ReturnType<typeof auditRec>[] = [], strict = true): Promise<VideoDoc> {
    const r = await m6.docUpdate<VideoData>("video", { id: doc.id, ...videoKeys(data), data }, strict ? doc.version : undefined, audit);
    if (!r.ok) throw new ApiError("CONFLICT");
    return (await load(doc.id));
  }

  /** Folds a provider state into the record. Never moves a ready video back. Returns the (possibly new) doc. */
  async function apply(doc: VideoDoc, s: { state: VideoData["status"]; durationS: number | null; errorReason: string | null }, actor: Actor | typeof system): Promise<VideoDoc> {
    const cur = doc.data;
    if (cur.status === "ready" && s.state !== "error") return doc;
    const next: VideoData = { ...cur, status: s.state, durationS: s.durationS ?? cur.durationS, errorReason: s.state === "error" ? s.errorReason : null };
    if (next.status === cur.status && next.durationS === cur.durationS && next.errorReason === cur.errorReason) return doc;
    const out = await write(doc, next, [auditRec(actor, { action: "video.status", entity: "video", entityId: doc.id, data: { from: cur.status, to: next.status } })], false);
    if (next.status === "ready" || cur.status === "ready") deps.revalidate(["articles", "home"]);
    return out;
  }

  return {
    async list(actor, q) {
      assertCan(actor, "content.edit");
      let rows = await m6.docList<VideoData>("video");
      if (q.ready === "1") rows = rows.filter((d) => d.data.status === "ready");
      const total = rows.length;
      const page = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
      return { data: page.map((d) => dto(d)), meta: { page: q.page, pageSize: q.pageSize, total } };
    },

    async create(actor, body) {
      assertCan(actor, "content.edit");
      if (provider.kind === "mock" && process.env.NODE_ENV === "production") {
        throw new ApiError("PROVIDER_UNAVAILABLE", { message: "Video uploads are not set up on this server (VIDEO_PROVIDER=cloudflare)." });
      }
      const up = await provider.createUpload({ name: body.title.en, sizeBytes: body.sizeBytes, maxDurationS: VIDEO_LIMITS.maxDurationS });
      const data: VideoData = {
        provider: provider.kind,
        providerUid: up.uid,
        title: { en: body.title.en, hi: body.title.hi?.trim() || null },
        fileName: body.fileName,
        status: "uploading",
        durationS: null,
        sizeBytes: body.sizeBytes,
        captions: [],
        posterTimeS: null,
        errorReason: null,
        createdBy: actor.name,
        createdById: actor.userId,
      };
      const id = newId();
      const r = await m6.docInsert<VideoData>("video", { id, ...videoKeys(data), data }, [auditRec(actor, { action: "video.create", entity: "video", entityId: id, data: { title: data.title.en, sizeBytes: data.sizeBytes, provider: data.provider } })]);
      if (!r.ok) throw new ApiError("CONFLICT");
      return dto(await load(id), up.uploadUrl);
    },

    async get(actor, id) {
      assertCan(actor, "content.edit");
      let d = await load(id);
      if (d.data.status === "uploading" || d.data.status === "processing") {
        const remote = await provider.getVideo(d.data.providerUid).catch(() => null);
        if (remote) d = await apply(d, remote, actor);
      }
      return dto(d);
    },

    async patch(actor, id, body) {
      assertCan(actor, "content.edit");
      const d = await load(id);
      if (d.version !== body.version) throw new ApiError("CONFLICT");
      const next: VideoData = { ...d.data };
      if (body.title) next.title = { en: body.title.en, hi: body.title.hi?.trim() || null };
      if (body.posterTimeS !== undefined) next.posterTimeS = body.posterTimeS;
      const out = await write(d, next, [auditRec(actor, { action: "video.update", entity: "video", entityId: id, data: { title: !!body.title, posterTimeS: body.posterTimeS ?? null } })]);
      if (out.data.status === "ready") deps.revalidate(["articles", "home"]);
      return dto(out);
    },

    async remove(actor, id) {
      assertCan(actor, "content.edit");
      const d = await load(id);
      const ref = cfVideoRef(id);
      const used = (await nativeAll(repo)).find((a) => a.data.video === ref);
      if (used) throw new ApiError("CONFLICT", { message: `This video is used by the article "${used.data.title.en}". Remove it from the article first.` });
      await provider.deleteVideo(d.data.providerUid);
      await m6.docDelete("video", id, [auditRec(actor, { action: "video.delete", entity: "video", entityId: id, data: { title: d.data.title.en } })]);
    },

    async addCaptions(actor, id, lang, file) {
      assertCan(actor, "content.edit");
      if (file.bytes.byteLength > VIDEO_LIMITS.captionBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: "The caption file is too large." } });
      if (!/\.(srt|vtt)$/i.test(file.name)) throw new ApiError("VALIDATION_FAILED", { fields: { file: "Upload a .srt or .vtt file." } });
      const d = await load(id);
      if (d.data.status !== "ready") throw new ApiError("CONFLICT", { message: "Captions can be added once the video is ready." });
      const vtt = toVtt(new TextDecoder("utf-8").decode(file.bytes));
      await provider.uploadCaptions(d.data.providerUid, lang, vtt);
      const captions = [...d.data.captions.filter((c) => c.lang !== lang), { lang, label: LABEL[lang] }];
      const out = await write(d, { ...d.data, captions }, [auditRec(actor, { action: "video.captions", entity: "video", entityId: id, data: { lang } })], false);
      deps.revalidate(["articles", "home"]);
      return dto(out);
    },

    async handleWebhook(rawBody, signature) {
      if (!provider.verifyWebhook(rawBody, signature)) throw new ApiError("FORBIDDEN");
      const ev = provider.parseWebhook(rawBody);
      if (!ev) return;
      const [doc] = await m6.docList<VideoData>("video", { k1: ev.uid, limit: 1 });
      if (!doc) return; // not ours (or deleted): acknowledge so the provider stops retrying
      await apply(doc, ev, system);
    },
  };
}
