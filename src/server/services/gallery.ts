import { type GalleryAlbum, type GalleryAlbumDetail, type GalleryFacets, type GalleryKind, type GalleryPage, type GalleryPhoto, type GalleryQuery, PUBLIC_EVENT_STATUSES, type I18nText, type Media } from "@/contract";
import { mediaUrl } from "../domain/articles";
import type { DataRepo } from "../repo/types";
import { listMerged } from "./articles";
import { albumsOf, photosOf } from "./gallery-store";
import { pageOffset } from "./shared";
import type { GalleryService, ServiceDeps } from "./types";

interface Built {
  album: GalleryAlbum;
  photos: GalleryPhoto[];
}

const MAX_ARTICLES = 500;
const MAX_EVENTS = 500;

/** Public files only: a photo must live under the public media base (never the private upload area). */
function isPublicUrl(url: string, base: string): boolean {
  const b = base.replace(/\/$/, "");
  return url.startsWith(`${b}/`) || /^\/media\//.test(url) || /^https?:\/\//.test(url);
}

function dedupe(photos: GalleryPhoto[]): GalleryPhoto[] {
  const seen = new Set<string>();
  return photos.filter((p) => (seen.has(p.src) ? false : (seen.add(p.src), true)));
}

const fromMedia = (m: Media, title: I18nText): GalleryPhoto => ({
  src: m.url,
  width: m.width,
  height: m.height,
  alt: m.alt,
  // A caption is only worth showing when it differs from the album title (legacy alt falls back to the title).
  caption: m.alt.en && m.alt.en !== title.en ? m.alt : null,
});

function album(slug: string, kind: GalleryKind, title: I18nText, date: Date, photos: GalleryPhoto[], href: string | null): Built | null {
  const ph = dedupe(photos);
  if (ph.length === 0) return null;
  return { album: { slug, title, date: date.toISOString(), kind, cover: ph[0], count: ph.length, href }, photos: ph };
}

async function buildAll(repo: DataRepo, deps: ServiceDeps): Promise<Built[]> {
  const out: (Built | null)[] = [];

  // Published articles (native + legacy). A post with a single photo is not an album.
  const { rows } = await listMerged(repo, deps, "all", 0, MAX_ARTICLES);
  for (const a of rows) {
    const photos = [...(a.cover ? [a.cover] : []), ...a.gallery].filter((m) => isPublicUrl(m.url, deps.mediaBase)).map((m) => fromMedia(m, a.title));
    const b = album(a.slug, "news", a.title, new Date(a.publishedAt), photos, `/news/${a.slug}`);
    if (b && b.album.count >= 2) out.push(b);
  }

  // Legacy home slider.
  const slides = await repo.sliderImages();
  out.push(
    album(
      "highlights",
      "highlights",
      { en: "Highlights", hi: "झलकियाँ" },
      deps.now(),
      slides.map((s) => ({
        src: mediaUrl(deps.mediaBase, s.image),
        alt: { en: s.caption1 ?? "Highlights", hi: null },
        caption: s.caption1 ? { en: [s.caption1, s.caption2].filter(Boolean).join(" · "), hi: null } : null,
      })),
      null,
    ),
  );

  // Published portal albums: approved photos with a public file, cover first, then order.
  const native = new Map<string, Built>();
  const nativeEvents = new Map<string, string>();
  const photos = await photosOf(repo, { status: "approved" });
  for (const a of await albumsOf(repo, { status: "published" })) {
    const own = photos.filter((p) => p.data.albumId === a.id && p.data.publicPath).sort((x, y) => (y.id === a.data.coverPhotoId ? 1 : 0) - (x.id === a.data.coverPhotoId ? 1 : 0) || x.data.order - y.data.order);
    const ph: GalleryPhoto[] = own.map((p) => ({
      src: mediaUrl(deps.mediaBase, p.data.publicPath!),
      width: p.data.width,
      height: p.data.height,
      alt: p.data.alt.en ? p.data.alt : a.data.title,
      caption: p.data.caption.en ? p.data.caption : null,
    }));
    const b = album(a.data.slug, a.data.eventId ? "event" : "album", a.data.title, new Date(`${a.data.date}T00:00:00+05:30`), ph, a.data.eventId ? `/events/${a.data.eventId}` : null);
    if (!b) continue;
    native.set(a.data.slug, b);
    if (a.data.eventId) nativeEvents.set(a.data.eventId, a.data.slug);
    out.push(b);
  }

  // Approved event results photos.
  const evs = await repo.listEvents({ statuses: PUBLIC_EVENT_STATUSES, order: "desc", limit: MAX_EVENTS, offset: 0 });
  for (const e of evs.rows) {
    if (!e.approvedAt || e.resultsPhotos.length === 0) continue;
    const title = { en: e.titleEn, hi: e.titleHi };
    const results = e.resultsPhotos.filter((m) => isPublicUrl(m.url, deps.mediaBase)).map((m) => fromMedia(m, title));
    const nativeSlug = nativeEvents.get(e.id);
    if (nativeSlug) {
      // The portal album for this event absorbs the results photos instead of a second card.
      const n = native.get(nativeSlug)!;
      n.photos = dedupe([...n.photos, ...results]);
      n.album.count = n.photos.length;
      continue;
    }
    out.push(album(`event-${e.id}`, "event", title, e.startsAt, results, `/events/${e.id}`));
  }

  // Centre photos (uploaded by coordinators through the portal, stored publicly).
  for (const c of await repo.centres()) {
    if (!c.active || c.photos.length === 0) continue;
    const title = { en: c.nameEn, hi: c.nameHi };
    out.push(album(`centre-${c.slug}`, "centre", title, c.updatedAt ?? deps.now(), c.photos.filter((m) => isPublicUrl(m.url, deps.mediaBase)).map((m) => fromMedia(m, title)), `/centres/${c.slug}`));
  }

  return out.filter((b): b is Built => b !== null).sort((x, y) => y.album.date.localeCompare(x.album.date) || x.album.slug.localeCompare(y.album.slug));
}

function facets(all: Built[]): GalleryFacets {
  const years = [...new Set(all.map((b) => Number(b.album.date.slice(0, 4))))].sort((a, b) => b - a);
  const kinds = (["album", "event", "news", "centre", "highlights"] as const).map((kind) => ({ kind, count: all.filter((b) => b.album.kind === kind).length })).filter((k) => k.count > 0);
  return { years, kinds };
}

export function createGalleryService(repo: DataRepo, deps: ServiceDeps): GalleryService {
  const find = async (slug: string) => (await buildAll(repo, deps)).find((b) => b.album.slug === slug) ?? null;
  return {
    async albums(q: GalleryQuery): Promise<GalleryPage> {
      const all = await buildAll(repo, deps);
      const rows = all.filter((b) => (!q.kind || b.album.kind === q.kind) && (!q.year || b.album.date.startsWith(String(q.year))));
      const off = pageOffset(q.page, q.pageSize);
      return {
        data: rows.slice(off, off + q.pageSize).map((b) => b.album),
        meta: { page: q.page, pageSize: q.pageSize, total: rows.length },
        facets: facets(all),
      };
    },

    async album(slug: string): Promise<GalleryAlbumDetail | null> {
      const hit = await find(slug);
      return hit ? { ...hit.album, photos: hit.photos } : null;
    },

    async exists(slug: string): Promise<boolean> {
      return (await find(slug)) !== null;
    },
  };
}
