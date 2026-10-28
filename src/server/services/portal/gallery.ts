// Gallery admin (spec 52): photo review, non-destructive editor, albums and WhatsApp intake.
// Records are JSON docs (gallery-store.ts). Originals live privately under gallery/orig/, edited
// renderings under gallery/derived/, and ONLY approved photos are copied (stripped JPEG) to public media.
import {
  API_BASE,
  type AdminGalleryAlbum,
  type AdminGalleryAlbumDetail,
  type AdminGalleryPhoto,
  GALLERY_LIMITS,
  type GalleryAlbumCreate,
  type GalleryAlbumPatch,
  type GalleryPhotoPatch,
  type I18nText,
} from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan, can } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { addDays, istDate, istDayStart, toIso } from "../../domain/time";
import { mediaUrl } from "../../domain/articles";
import { sniffMime } from "../../files";
import { ApiError } from "../../http/errors";
import { probe, render } from "../../media/image";
import type { AuditRec, EventRec } from "../../repo/types";
import { i18n } from "../org-index";
import { type AlbumData, type AlbumDoc, albumKeys, albumsOf, NO_ALBUM, type PhotoData, type PhotoDoc, photoKeys, photosOf } from "../gallery-store";
import { loadOrg, scopeSamithiIds, type PortalCtx } from "./shared";
import type { AdminGalleryService, GalleryTarget } from "./gallery-types";

const REVIEWABLE_EVENT = ["planned", "awaiting_report", "report_submitted", "approved"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const vis = (a: Actor, scopeId: string | null) => a.all || (!!scopeId && a.unitIds.has(scopeId));
const blank = (): I18nText => ({ en: "", hi: null });
const hiOrNull = (s: string | null | undefined) => s?.trim() || null;

export function createGalleryAdminService(ctx: PortalCtx): AdminGalleryService {
  const { repo, deps } = ctx;
  const m6 = repo.m6;
  const now = () => deps.now();
  const L = GALLERY_LIMITS;

  const mustView = (a: Actor) => {
    if (!can(a, "gallery.upload") && !can(a, "gallery.review")) throw new ApiError("FORBIDDEN");
  };
  const canReview = (a: Actor, scopeId: string | null) => can(a, "gallery.review") && vis(a, scopeId);

  // ---- loading -------------------------------------------------------------
  async function photoDoc(actor: Actor, id: string): Promise<PhotoDoc> {
    const d = await m6.docGet<PhotoData>("gallery_photo", id);
    if (!d || !vis(actor, d.data.scopeId)) throw new ApiError("NOT_FOUND");
    return d;
  }
  async function albumDoc(actor: Actor, id: string): Promise<AlbumDoc> {
    const d = await m6.docGet<AlbumData>("gallery_album", id);
    if (!d || !vis(actor, d.data.scopeId)) throw new ApiError("NOT_FOUND");
    return d;
  }
  async function original(p: PhotoData): Promise<Uint8Array> {
    const b = await deps.storage.get(p.origPath);
    if (!b) throw new ApiError("INTERNAL", { message: "The original photo file is missing." });
    return b;
  }

  async function writePhoto(doc: PhotoDoc, data: PhotoData, audit: AuditRec[], cleanup: () => Promise<void> = async () => {}) {
    const r = await m6.docUpdate<PhotoData>("gallery_photo", { id: doc.id, ...photoKeys(data), data }, doc.version, audit);
    if (!r.ok) {
      await cleanup();
      throw new ApiError("CONFLICT");
    }
    return r.version;
  }
  async function writeAlbum(doc: AlbumDoc, data: AlbumData, audit: AuditRec[], expect?: number) {
    const r = await m6.docUpdate<AlbumData>("gallery_album", { id: doc.id, ...albumKeys(data), data }, expect, audit);
    if (!r.ok) throw new ApiError("CONFLICT");
    return r.version;
  }

  const publicRel = (id: string, rev: number) => `gallery/${id.toLowerCase()}-r${rev}.jpg`;
  async function putPublic(id: string, rev: number, bytes: Uint8Array): Promise<string> {
    const rel = publicRel(id, rev);
    await deps.publicMedia.delete?.(rel);
    await deps.publicMedia.put(rel, bytes);
    return rel;
  }
  const dropPublic = (rel: string | null) => (rel ? deps.publicMedia.delete?.(rel) : undefined);

  // ---- DTO -----------------------------------------------------------------
  class Cache {
    private albums = new Map<string, AlbumDoc | null>();
    private events = new Map<string, EventRec | null>();
    constructor(readonly actor: Actor) {}
    async album(id: string | null) {
      if (!id) return null;
      if (!this.albums.has(id)) this.albums.set(id, await m6.docGet<AlbumData>("gallery_album", id));
      return this.albums.get(id)!;
    }
    async event(id: string | null) {
      if (!id) return null;
      if (!this.events.has(id)) this.events.set(id, await repo.eventById(id));
      return this.events.get(id)!;
    }
  }
  const fileUrl = (id: string, variant: string, rev: number) => `${API_BASE}/admin/gallery/photos/${id}/file?variant=${variant}&rev=${rev}`;

  async function photoDto(d: PhotoDoc, c: Cache): Promise<AdminGalleryPhoto> {
    const p = d.data;
    const [al, ev] = await Promise.all([c.album(p.albumId), c.event(p.eventId)]);
    const rv = canReview(c.actor, p.scopeId);
    return {
      id: d.id,
      status: p.status,
      source: p.source,
      album: al ? { id: al.id, title: al.data.title, status: al.data.status } : null,
      event: ev ? { id: ev.id, title: i18n(ev.titleEn, ev.titleHi), startsAt: toIso(ev.startsAt) } : null,
      caption: p.caption,
      alt: p.alt,
      previewUrl: fileUrl(d.id, "preview", p.revision),
      originalUrl: fileUrl(d.id, "original", 0),
      publicUrl: p.publicPath ? mediaUrl(deps.mediaBase, p.publicPath) : null,
      width: p.width,
      height: p.height,
      bytes: p.bytes,
      edits: p.edits,
      revision: p.revision,
      isCover: !!al && al.data.coverPhotoId === d.id,
      from: p.from,
      receivedAt: p.receivedAt,
      reviewedBy: p.reviewedBy,
      reviewedAt: p.reviewedAt,
      rejectReason: p.rejectReason,
      version: d.version,
      can: { review: rv, edit: rv },
    };
  }

  async function albumDto(d: AlbumDoc, photos: readonly PhotoDoc[], c: Cache): Promise<AdminGalleryAlbum> {
    const a = d.data;
    const org = await loadOrg(repo);
    const unit = a.scopeId ? org.get(a.scopeId) : undefined;
    const ev = await c.event(a.eventId);
    const cover = a.coverPhotoId ? photos.find((p) => p.id === a.coverPhotoId && p.data.status === "approved") : undefined;
    const count = (s: string) => photos.filter((p) => p.data.status === s).length;
    return {
      id: d.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      date: a.date,
      status: a.status,
      event: ev ? { id: ev.id, title: i18n(ev.titleEn, ev.titleHi) } : null,
      scope: unit ? { id: unit.id, name: i18n(unit.nameEn, unit.nameHi) } : null,
      coverPhotoId: cover ? cover.id : null,
      coverUrl: cover?.data.publicPath ? mediaUrl(deps.mediaBase, cover.data.publicPath) : null,
      counts: { pending: count("pending"), approved: count("approved"), rejected: count("rejected") },
      publicUrl: a.status === "published" ? `/gallery/${a.slug}` : null,
      version: d.version,
      updatedAt: toIso(d.updatedAt),
    };
  }

  const byOrder = (x: PhotoDoc, y: PhotoDoc) => x.data.order - y.data.order || x.data.receivedAt.localeCompare(y.data.receivedAt);
  const revalidate = () => deps.revalidate(["gallery"]);

  // ---- albums --------------------------------------------------------------
  async function uniqueSlug(title: string, id: string): Promise<string> {
    return `${slugify(title) || "album"}-${id.slice(-6).toLowerCase()}`;
  }

  async function ensureAlbum(actor: Actor, body: GalleryAlbumCreate): Promise<AlbumDoc> {
    if (body.eventId) {
      const ev = await repo.eventById(body.eventId);
      if (!ev || !vis(actor, ev.samithiId)) throw new ApiError("NOT_FOUND");
      const existing = (await albumsOf(repo)).find((a) => a.data.eventId === ev.id);
      if (existing) {
        if (!vis(actor, existing.data.scopeId)) throw new ApiError("NOT_FOUND");
        return existing;
      }
      return insertAlbum(actor, {
        title: body.title ? { en: body.title.en, hi: hiOrNull(body.title.hi) } : i18n(ev.titleEn, ev.titleHi),
        description: body.description ? { en: body.description.en, hi: hiOrNull(body.description.hi) } : blank(),
        date: body.date ?? istDate(ev.startsAt),
        eventId: ev.id,
        scopeId: ev.samithiId,
      });
    }
    if (!body.title) throw new ApiError("VALIDATION_FAILED", { fields: { title: "Give the album a title." } });
    const scopeId = body.scopeId ?? actor.scopeId;
    if (!scopeId || !vis(actor, scopeId)) throw new ApiError("NOT_FOUND");
    return insertAlbum(actor, {
      title: { en: body.title.en, hi: hiOrNull(body.title.hi) },
      description: body.description ? { en: body.description.en, hi: hiOrNull(body.description.hi) } : blank(),
      date: body.date ?? istDate(now()),
      eventId: null,
      scopeId,
    });
  }

  async function insertAlbum(actor: Actor, a: Pick<AlbumData, "title" | "description" | "date" | "eventId" | "scopeId">): Promise<AlbumDoc> {
    const id = newId();
    const data: AlbumData = { ...a, slug: await uniqueSlug(a.title.en, id), status: "draft", coverPhotoId: null, createdBy: actor.userId };
    const r = await m6.docInsert<AlbumData>("gallery_album", { id, ...albumKeys(data), data }, [
      auditRec(actor, { action: "gallery.album.create", entity: "gallery_album", entityId: id, scopeId: data.scopeId, data: { title: data.title.en, eventId: data.eventId } }),
    ]);
    if (!r.ok) throw new ApiError("CONFLICT");
    return (await m6.docGet<AlbumData>("gallery_album", id))!;
  }

  async function nextOrder(albumId: string): Promise<number> {
    const ph = await photosOf(repo, { albumId });
    return ph.reduce((m, p) => Math.max(m, p.data.order), 0) + 1;
  }

  // ---- shared edit/approve primitives ---------------------------------------
  async function approveOne(actor: Actor, id: string, version: number, albumId?: string): Promise<PhotoDoc> {
    assertCan(actor, "gallery.review");
    const doc = await photoDoc(actor, id);
    if (doc.version !== version) throw new ApiError("CONFLICT");
    const p = doc.data;
    if (p.status === "approved") throw new ApiError("CONFLICT", { message: "This photo is already approved." });
    const targetId = albumId ?? p.albumId;
    if (!targetId) throw new ApiError("VALIDATION_FAILED", { fields: { albumId: "Choose an album for this photo." } });
    const album = await albumDoc(actor, targetId).catch(() => {
      throw new ApiError("VALIDATION_FAILED", { fields: { albumId: "That album was not found." } });
    });
    const out = await render(await original(p), p.edits, L.maxEdge);
    const rel = await putPublic(doc.id, p.revision, out.bytes);
    const moved = p.albumId !== album.id;
    const next: PhotoData = {
      ...p,
      status: "approved",
      albumId: album.id,
      eventId: p.eventId ?? album.data.eventId,
      scopeId: p.scopeId ?? album.data.scopeId,
      publicPath: rel,
      width: out.width,
      height: out.height,
      order: moved ? await nextOrder(album.id) : p.order,
      reviewedBy: actor.name,
      reviewedAt: toIso(now()),
      rejectReason: null,
    };
    await writePhoto(doc, next, [auditRec(actor, { action: "gallery.photo.approve", entity: "gallery_photo", entityId: doc.id, scopeId: p.scopeId, data: { albumId: album.id } })], async () => void (await dropPublic(rel)));
    if (!album.data.coverPhotoId) await writeAlbum(album, { ...album.data, coverPhotoId: doc.id }, [], undefined);
    if (album.data.status === "published") revalidate();
    return (await m6.docGet<PhotoData>("gallery_photo", doc.id))!;
  }

  async function rejectOne(actor: Actor, id: string, version: number, reason: string): Promise<PhotoDoc> {
    assertCan(actor, "gallery.review");
    const doc = await photoDoc(actor, id);
    if (doc.version !== version) throw new ApiError("CONFLICT");
    const p = doc.data;
    const wasPublic = p.status === "approved";
    await writePhoto(doc, { ...p, status: "rejected", publicPath: null, rejectReason: reason, reviewedBy: actor.name, reviewedAt: toIso(now()) }, [
      auditRec(actor, { action: "gallery.photo.reject", entity: "gallery_photo", entityId: doc.id, scopeId: p.scopeId, data: { reason } }),
    ]);
    await dropPublic(p.publicPath);
    if (p.albumId) {
      const al = await m6.docGet<AlbumData>("gallery_album", p.albumId);
      if (al && al.data.coverPhotoId === doc.id) await writeAlbum(al, { ...al.data, coverPhotoId: null }, []);
    }
    if (wasPublic) revalidate();
    return (await m6.docGet<PhotoData>("gallery_photo", doc.id))!;
  }

  // ---- service -------------------------------------------------------------
  const svc: AdminGalleryService = {
    async photos(actor, q) {
      mustView(actor);
      const k1 = q.albumId === undefined ? undefined : q.albumId === NO_ALBUM ? NO_ALBUM : q.albumId;
      const all = (await photosOf(repo, k1 ? { albumId: k1 } : {})).filter((d) => vis(actor, d.data.scopeId));
      const rows = all.filter((d) => d.data.status === q.status);
      rows.sort(k1 && k1 !== NO_ALBUM ? byOrder : (x, y) => y.data.receivedAt.localeCompare(x.data.receivedAt));
      const page = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
      const c = new Cache(actor);
      return {
        data: await Promise.all(page.map((d) => photoDto(d, c))),
        meta: {
          page: q.page,
          pageSize: q.pageSize,
          total: rows.length,
          counts: { pending: all.filter((d) => d.data.status === "pending").length, approved: all.filter((d) => d.data.status === "approved").length, rejected: all.filter((d) => d.data.status === "rejected").length },
        },
      };
    },

    async photo(actor, id) {
      mustView(actor);
      return photoDto(await photoDoc(actor, id), new Cache(actor));
    },

    async patchPhoto(actor, id, body: GalleryPhotoPatch) {
      assertCan(actor, "gallery.review");
      const doc = await photoDoc(actor, id);
      if (doc.version !== body.version) throw new ApiError("CONFLICT");
      const p = doc.data;
      const next: PhotoData = { ...p };
      if (body.caption) next.caption = { en: body.caption.en, hi: hiOrNull(body.caption.hi) };
      if (body.alt) next.alt = { en: body.alt.en, hi: hiOrNull(body.alt.hi) };
      let target: AlbumDoc | null = p.albumId ? await m6.docGet<AlbumData>("gallery_album", p.albumId) : null;
      let oldAlbum: AlbumDoc | null = null;
      if (body.albumId !== undefined && body.albumId !== p.albumId) {
        if (body.albumId === null) {
          if (p.status === "approved") throw new ApiError("VALIDATION_FAILED", { fields: { albumId: "An approved photo needs an album." } });
          oldAlbum = target;
          target = null;
          next.albumId = null;
        } else {
          const to = await albumDoc(actor, body.albumId).catch(() => {
            throw new ApiError("VALIDATION_FAILED", { fields: { albumId: "That album was not found." } });
          });
          oldAlbum = target;
          target = to;
          next.albumId = to.id;
          next.eventId = to.data.eventId ?? next.eventId;
          next.order = await nextOrder(to.id);
        }
      }
      if (body.setCover) {
        if (!target || next.status !== "approved") throw new ApiError("VALIDATION_FAILED", { fields: { setCover: "Only an approved photo in an album can be the cover." } });
      }
      await writePhoto(doc, next, [auditRec(actor, { action: "gallery.photo.update", entity: "gallery_photo", entityId: id, scopeId: p.scopeId, data: { albumId: next.albumId, caption: !!body.caption, alt: !!body.alt, cover: !!body.setCover } })]);
      if (oldAlbum && oldAlbum.data.coverPhotoId === id) await writeAlbum(oldAlbum, { ...oldAlbum.data, coverPhotoId: null }, []);
      if (body.setCover && target) await writeAlbum(target, { ...target.data, coverPhotoId: id }, []);
      if (p.status === "approved" || oldAlbum?.data.status === "published" || target?.data.status === "published") revalidate();
      return photoDto((await m6.docGet<PhotoData>("gallery_photo", id))!, new Cache(actor));
    },

    async editPhoto(actor, id, body) {
      assertCan(actor, "gallery.review");
      const doc = await photoDoc(actor, id);
      if (doc.version !== body.version) throw new ApiError("CONFLICT");
      const p = doc.data;
      const orig = await original(p);
      const out = await render(orig, body.edits, L.maxEdge);
      const revision = p.revision + 1;
      const made: string[] = [];
      let derivedPath: string | null = null;
      if (body.edits) {
        derivedPath = `gallery/derived/${doc.id.toLowerCase()}-r${revision}.jpg`;
        await deps.storage.delete?.(derivedPath);
        await deps.storage.put(derivedPath, out.bytes);
      }
      let publicPath = p.publicPath;
      if (p.status === "approved") {
        publicPath = await putPublic(doc.id, revision, out.bytes);
        made.push(publicPath);
      }
      const next: PhotoData = {
        ...p,
        edits: body.edits,
        revision,
        derivedPath,
        publicPath,
        width: out.width,
        height: out.height,
        caption: body.caption ? { en: body.caption.en, hi: hiOrNull(body.caption.hi) } : p.caption,
        alt: body.alt ? { en: body.alt.en, hi: hiOrNull(body.alt.hi) } : p.alt,
      };
      let album: AlbumDoc | null = null;
      if (body.setCover) {
        album = p.albumId ? await m6.docGet<AlbumData>("gallery_album", p.albumId) : null;
        if (!album || p.status !== "approved") {
          await Promise.all(made.map((m) => dropPublic(m)));
          throw new ApiError("VALIDATION_FAILED", { fields: { setCover: "Only an approved photo in an album can be the cover." } });
        }
      }
      await writePhoto(doc, next, [auditRec(actor, { action: body.edits ? "gallery.photo.edit" : "gallery.photo.revert", entity: "gallery_photo", entityId: id, scopeId: p.scopeId, data: { revision, edits: body.edits } })], async () => {
        await Promise.all(made.map((m) => dropPublic(m)));
        await deps.storage.delete?.(derivedPath ?? "");
      });
      if (p.status === "approved" && p.publicPath && p.publicPath !== publicPath) await dropPublic(p.publicPath);
      if (album) await writeAlbum(album, { ...album.data, coverPhotoId: id }, []);
      if (p.status === "approved") revalidate();
      return photoDto((await m6.docGet<PhotoData>("gallery_photo", id))!, new Cache(actor));
    },

    async approve(actor, id, body) {
      const d = await approveOne(actor, id, body.version, body.albumId);
      return photoDto(d, new Cache(actor));
    },

    async reject(actor, id, body) {
      const d = await rejectOne(actor, id, body.version, body.reason);
      return photoDto(d, new Cache(actor));
    },

    async bulk(actor, body) {
      assertCan(actor, "gallery.review");
      if (body.action === "reject" && !body.reason?.trim()) throw new ApiError("VALIDATION_FAILED", { fields: { reason: "Give a reason." } });
      const done: string[] = [];
      const failed: { id: string; code: string }[] = [];
      for (const id of body.ids) {
        try {
          const doc = await photoDoc(actor, id);
          if (body.action === "approve") await approveOne(actor, id, doc.version, body.albumId);
          else await rejectOne(actor, id, doc.version, body.reason!.trim());
          done.push(id);
        } catch (e) {
          failed.push({ id, code: e instanceof ApiError ? e.code : "INTERNAL" });
        }
      }
      return { done, failed };
    },

    async upload(actor, file, fields) {
      assertCan(actor, "gallery.upload");
      const checked = await checkImage(file.bytes);
      if (!checked.ok) throw new ApiError("VALIDATION_FAILED", { fields: { file: checked.reason === "too_large" ? "The photo is larger than 10 MB." : "Use a JPG, PNG or WebP photo." } });
      let album: AlbumDoc | null = null;
      if (fields.albumId) {
        album = await albumDoc(actor, fields.albumId).catch(() => {
          throw new ApiError("VALIDATION_FAILED", { fields: { albumId: "That album was not found." } });
        });
      }
      const scopeId = album?.data.scopeId ?? actor.scopeId;
      const doc = await store({
        bytes: file.bytes,
        checked,
        source: "portal",
        scopeId,
        albumId: album?.id ?? null,
        eventId: album?.data.eventId ?? null,
        caption: fields.caption ? { en: fields.caption, hi: null } : blank(),
        from: actor.name,
        uploaderId: actor.userId,
        conversationId: null,
        actor,
        audit: "gallery.photo.upload",
      });
      return photoDto(doc, new Cache(actor));
    },

    async file(actor, id, variant) {
      mustView(actor);
      const doc = await photoDoc(actor, id);
      const p = doc.data;
      if (variant === "original") {
        await repo.portal.insertAudit(auditRec(actor, { action: "gallery.photo.view_original", entity: "gallery_photo", entityId: id, scopeId: p.scopeId }));
        return { bytes: (await render(await original(p), null, L.maxEdge)).bytes, mime: "image/jpeg" };
      }
      const src = p.derivedPath ? ((await deps.storage.get(p.derivedPath)) ?? (await original(p))) : await original(p);
      return { bytes: (await render(src, null, L.previewEdge)).bytes, mime: "image/jpeg" };
    },

    async albums(actor, q) {
      mustView(actor);
      const docs = (await albumsOf(repo, { status: q.status })).filter((d) => vis(actor, d.data.scopeId));
      docs.sort((a, b) => b.data.date.localeCompare(a.data.date) || b.createdAt.getTime() - a.createdAt.getTime());
      const page = docs.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
      const photos = await photosOf(repo);
      const c = new Cache(actor);
      return {
        data: await Promise.all(page.map((d) => albumDto(d, photos.filter((p) => p.data.albumId === d.id), c))),
        meta: { page: q.page, pageSize: q.pageSize, total: docs.length },
      };
    },

    async album(actor, id): Promise<AdminGalleryAlbumDetail> {
      mustView(actor);
      const d = await albumDoc(actor, id);
      const photos = (await photosOf(repo, { albumId: id })).sort(byOrder);
      const c = new Cache(actor);
      return { ...(await albumDto(d, photos, c)), photos: await Promise.all(photos.map((p) => photoDto(p, c))) };
    },

    async createAlbum(actor, body) {
      assertCan(actor, "gallery.upload");
      const d = await ensureAlbum(actor, body);
      return albumDto(d, await photosOf(repo, { albumId: d.id }), new Cache(actor));
    },

    async patchAlbum(actor, id, body: GalleryAlbumPatch) {
      mustView(actor);
      const doc = await albumDoc(actor, id);
      if (doc.version !== body.version) throw new ApiError("CONFLICT");
      const a = doc.data;
      const restricted = body.status !== undefined || body.coverPhotoId !== undefined || body.photoOrder !== undefined || a.status === "published";
      if (restricted) assertCan(actor, "gallery.review");
      else assertCan(actor, "gallery.upload");
      const photos = await photosOf(repo, { albumId: id });
      const next: AlbumData = { ...a };
      if (body.title) next.title = { en: body.title.en, hi: hiOrNull(body.title.hi) };
      if (body.description) next.description = { en: body.description.en, hi: hiOrNull(body.description.hi) };
      if (body.date) next.date = body.date;
      if (body.coverPhotoId !== undefined) {
        if (body.coverPhotoId !== null && !photos.some((p) => p.id === body.coverPhotoId && p.data.status === "approved")) {
          throw new ApiError("VALIDATION_FAILED", { fields: { coverPhotoId: "The cover must be an approved photo of this album." } });
        }
        next.coverPhotoId = body.coverPhotoId;
      }
      if (body.status) {
        if (body.status === "published" && !photos.some((p) => p.data.status === "approved")) {
          throw new ApiError("VALIDATION_FAILED", { fields: { status: "Approve at least one photo before publishing." } });
        }
        next.status = body.status;
      }
      if (body.photoOrder) {
        const ids = new Set(photos.map((p) => p.id));
        if (body.photoOrder.some((x) => !ids.has(x)) || new Set(body.photoOrder).size !== body.photoOrder.length) {
          throw new ApiError("VALIDATION_FAILED", { fields: { photoOrder: "The order lists photos that are not in this album." } });
        }
        for (const [i, pid] of body.photoOrder.entries()) {
          const ph = photos.find((p) => p.id === pid)!;
          if (ph.data.order !== i + 1) await m6.docUpdate<PhotoData>("gallery_photo", { id: pid, ...photoKeys(ph.data), data: { ...ph.data, order: i + 1 } });
        }
      }
      if (next.status === "published" && !next.coverPhotoId) next.coverPhotoId = photos.filter((p) => p.data.status === "approved").sort(byOrder)[0]?.id ?? null;
      const changed = Object.keys(body).filter((k) => k !== "version");
      await writeAlbum(doc, next, [auditRec(actor, { action: body.status && body.status !== a.status ? `gallery.album.${body.status === "published" ? "publish" : "unpublish"}` : "gallery.album.update", entity: "gallery_album", entityId: id, scopeId: a.scopeId, data: { fields: changed } })], body.version);
      if (a.status === "published" || next.status === "published") revalidate();
      const fresh = (await m6.docGet<AlbumData>("gallery_album", id))!;
      return albumDto(fresh, await photosOf(repo, { albumId: id }), new Cache(actor));
    },

    // ---- WhatsApp -----------------------------------------------------------
    async intake(i) {
      if (!can(i.actor, "gallery.upload")) return { ok: false, reason: "not_allowed" };
      const checked = await checkImage(i.bytes);
      if (!checked.ok) return { ok: false, reason: checked.reason };
      try {
        const doc = await store({
          bytes: i.bytes,
          checked,
          source: "whatsapp",
          scopeId: i.actor.scopeId,
          albumId: null,
          eventId: null,
          caption: i.caption?.trim() ? { en: i.caption.trim().slice(0, 300), hi: null } : blank(),
          from: i.senderMasked,
          uploaderId: i.actor.userId,
          conversationId: i.conversationId,
          actor: i.actor,
          audit: "gallery.photo.intake",
        });
        return { ok: true, photoId: doc.id };
      } catch (e) {
        console.error("[gallery] intake failed", e instanceof Error ? e.message : e);
        return { ok: false, reason: "store_failed" };
      }
    },

    async targets(actor) {
      const org = await loadOrg(repo);
      const day = istDate(now());
      const { rows } = await repo.portal.listAdminEvents({
        samithiIds: scopeSamithiIds(actor, org),
        statuses: REVIEWABLE_EVENT,
        from: istDayStart(addDays(day, -14)),
        to: istDayStart(addDays(day, 1)),
        sort: "-startsAt",
        limit: 20,
        offset: 0,
      });
      const evT = (e: EventRec): GalleryTarget => ({ kind: "event", id: e.id, title: i18n(e.titleEn, e.titleHi), date: toIso(e.startsAt) });
      const recent = rows.filter((e) => e.startsAt.getTime() <= istDayStart(addDays(day, 1)).getTime());
      const yesterday = addDays(day, -1);
      const hot = recent.filter((e) => [day, yesterday].includes(istDate(e.startsAt)));
      const eventIds = new Set(recent.map((e) => e.id));
      const albums = (await albumsOf(repo))
        .filter((a) => vis(actor, a.data.scopeId) && !(a.data.eventId && eventIds.has(a.data.eventId)))
        .sort((x, y) => y.data.date.localeCompare(x.data.date))
        .slice(0, 10);
      const albumT = (a: AlbumDoc): GalleryTarget => ({ kind: "album", id: a.id, title: a.data.title, date: a.data.date });
      return { match: hot.length === 1 ? evT(hot[0]) : null, options: [...recent.map(evT), ...albums.map(albumT)] };
    },

    async assign(actor, photoIds, target) {
      assertCan(actor, "gallery.upload");
      const album = target.kind === "event" ? await ensureAlbum(actor, GalleryAlbumCreateInput({ eventId: target.id })) : await albumDoc(actor, target.id);
      let n = await nextOrder(album.id);
      for (const pid of photoIds) {
        const doc = await photoDoc(actor, pid);
        if (doc.data.status !== "pending") continue;
        await writePhoto(doc, { ...doc.data, albumId: album.id, eventId: album.data.eventId, scopeId: album.data.scopeId ?? doc.data.scopeId, order: n++ }, [
          auditRec(actor, { action: "gallery.photo.assign", entity: "gallery_photo", entityId: pid, scopeId: album.data.scopeId, data: { albumId: album.id, eventId: album.data.eventId } }),
        ]);
      }
      return album.id;
    },

    async withdraw(actor, photoIds) {
      assertCan(actor, "gallery.upload");
      const out: { bytes: Uint8Array; name: string | null; caption: string | null }[] = [];
      for (const pid of photoIds) {
        const doc = await photoDoc(actor, pid);
        if (doc.data.status !== "pending" || doc.data.source !== "whatsapp") continue;
        const bytes = await original(doc.data);
        await m6.docDelete("gallery_photo", pid, [auditRec(actor, { action: "gallery.photo.withdraw", entity: "gallery_photo", entityId: pid, scopeId: doc.data.scopeId })]);
        await deps.storage.delete?.(doc.data.origPath);
        out.push({ bytes, name: null, caption: doc.data.caption.en || null });
      }
      return out;
    },
  };

  // ---- intake helpers -------------------------------------------------------
  async function checkImage(bytes: Uint8Array): Promise<{ ok: true; mime: string; ext: string; width: number; height: number } | { ok: false; reason: "bad_type" | "too_large" }> {
    if (bytes.byteLength > L.bytes) return { ok: false, reason: "too_large" };
    const kind = sniffMime(bytes);
    if (!kind || !(L.mimes as readonly string[]).includes(kind.mime)) return { ok: false, reason: "bad_type" };
    const dims = await probe(bytes);
    if (!dims) return { ok: false, reason: "bad_type" };
    return { ok: true, mime: kind.mime, ext: kind.ext, ...dims };
  }

  async function store(i: {
    bytes: Uint8Array;
    checked: { mime: string; ext: string; width: number; height: number };
    source: PhotoData["source"];
    scopeId: string | null;
    albumId: string | null;
    eventId: string | null;
    caption: I18nText;
    from: string;
    uploaderId: string | null;
    conversationId: string | null;
    actor: Actor;
    audit: string;
  }): Promise<PhotoDoc> {
    const id = newId();
    const origPath = `gallery/orig/${id.toLowerCase()}.${i.checked.ext}`;
    await deps.storage.put(origPath, i.bytes);
    const data: PhotoData = {
      status: "pending",
      source: i.source,
      albumId: i.albumId,
      eventId: i.eventId,
      scopeId: i.scopeId,
      caption: i.caption,
      alt: blank(),
      origPath,
      origMime: i.checked.mime,
      bytes: i.bytes.byteLength,
      width: i.checked.width,
      height: i.checked.height,
      edits: null,
      revision: 0,
      derivedPath: null,
      publicPath: null,
      from: i.from,
      uploaderId: i.uploaderId,
      conversationId: i.conversationId,
      receivedAt: toIso(now()),
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: null,
      order: i.albumId ? await nextOrder(i.albumId) : 0,
    };
    const r = await m6.docInsert<PhotoData>("gallery_photo", { id, ...photoKeys(data), data }, [
      auditRec(i.actor, { action: i.audit, entity: "gallery_photo", entityId: id, scopeId: i.scopeId, data: { bytes: data.bytes, source: i.source, albumId: i.albumId } }),
    ]);
    if (!r.ok) {
      await deps.storage.delete?.(origPath);
      throw new ApiError("CONFLICT");
    }
    return (await m6.docGet<PhotoData>("gallery_photo", id))!;
  }

  return svc;
}

/** Minimal `GalleryAlbumCreate` for assign() (zod defaults filled by hand). */
function GalleryAlbumCreateInput(o: { eventId: string }): GalleryAlbumCreate {
  return { eventId: o.eventId, scopeId: null, description: { en: "", hi: null } };
}
