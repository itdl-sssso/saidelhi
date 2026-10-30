// Gallery records (stored as JSON docs in gallery_album / gallery_photo, see repo/m6-types.ts).
import type { GalleryAlbumStatus, GalleryPhotoSource, GalleryPhotoStatus, I18nText, PhotoEdits } from "@/contract";
import type { DocRec } from "../repo/m6-types";
import type { DataRepo } from "../repo/types";

export interface AlbumData {
  slug: string;
  title: I18nText;
  description: I18nText;
  /** 'YYYY-MM-DD' */
  date: string;
  status: GalleryAlbumStatus;
  eventId: string | null;
  scopeId: string | null;
  coverPhotoId: string | null;
  createdBy: string | null;
}

export interface PhotoData {
  status: GalleryPhotoStatus;
  source: GalleryPhotoSource;
  albumId: string | null;
  eventId: string | null;
  scopeId: string | null;
  caption: I18nText;
  alt: I18nText;
  /** Private original (storage-relative), never public. */
  origPath: string;
  origMime: string;
  bytes: number;
  /** Size of the current rendering. */
  width: number | null;
  height: number | null;
  edits: PhotoEdits | null;
  revision: number;
  /** Private derived JPEG of the current edits (null = original). */
  derivedPath: string | null;
  /** Public media path (relative to the public media root) while approved. */
  publicPath: string | null;
  from: string;
  uploaderId: string | null;
  conversationId: string | null;
  receivedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  order: number;
}

export type AlbumDoc = DocRec<AlbumData>;
export type PhotoDoc = DocRec<PhotoData>;

export const NO_ALBUM = "none";

export const albumsOf = (repo: DataRepo, q: { status?: GalleryAlbumStatus } = {}) => repo.m6.docList<AlbumData>("gallery_album", { k2: q.status });
export const photosOf = (repo: DataRepo, q: { albumId?: string; status?: GalleryPhotoStatus } = {}) => repo.m6.docList<PhotoData>("gallery_photo", { k1: q.albumId, k2: q.status });

export const photoKeys = (p: PhotoData) => ({ k1: p.albumId ?? NO_ALBUM, k2: p.status });
export const albumKeys = (a: AlbumData) => ({ k1: a.scopeId ?? NO_ALBUM, k2: a.status });
