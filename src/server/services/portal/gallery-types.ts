// v0.9.5 portal gallery service port (spec 52). Implemented in portal/gallery.ts.
import type {
  AdminGalleryAlbum,
  AdminGalleryAlbumDetail,
  AdminGalleryAlbumsQuery,
  AdminGalleryPhoto,
  AdminGalleryPhotosQuery,
  CountsMeta,
  GalleryAlbumCreate,
  GalleryAlbumPatch,
  GalleryPhotoApproveBody,
  GalleryPhotoBulkBody,
  GalleryPhotoEditBody,
  GalleryPhotoPatch,
  GalleryPhotoRejectBody,
  GalleryUploadForm,
  I18nText,
  PageMeta,
} from "@/contract";
import type { Actor } from "../../auth/rbac";
import type { UploadedFile } from "../types";

/** A photo arriving from WhatsApp (bot gallery flow). */
export interface GalleryIntakeInput {
  actor: Actor;
  bytes: Uint8Array;
  /** Sender-declared name/MIME: informational only, the MIME is sniffed. */
  name: string | null;
  caption: string | null;
  senderMasked: string;
  conversationId: string;
}

export type GalleryIntakeResult =
  | { ok: true; photoId: string }
  | { ok: false; reason: "not_allowed" | "bad_type" | "too_large" | "store_failed" };

/** Something a WhatsApp sender can file photos under. */
export interface GalleryTarget {
  kind: "event" | "album";
  id: string;
  title: I18nText;
  /** ISO date (event start / album date). */
  date: string;
}

export interface AdminGalleryService {
  photos(actor: Actor, q: AdminGalleryPhotosQuery): Promise<{ data: AdminGalleryPhoto[]; meta: CountsMeta }>;
  photo(actor: Actor, id: string): Promise<AdminGalleryPhoto>;
  patchPhoto(actor: Actor, id: string, body: GalleryPhotoPatch): Promise<AdminGalleryPhoto>;
  editPhoto(actor: Actor, id: string, body: GalleryPhotoEditBody): Promise<AdminGalleryPhoto>;
  approve(actor: Actor, id: string, body: GalleryPhotoApproveBody): Promise<AdminGalleryPhoto>;
  reject(actor: Actor, id: string, body: GalleryPhotoRejectBody): Promise<AdminGalleryPhoto>;
  bulk(actor: Actor, body: GalleryPhotoBulkBody): Promise<{ done: string[]; failed: { id: string; code: string }[] }>;
  upload(actor: Actor, file: UploadedFile, fields: GalleryUploadForm): Promise<AdminGalleryPhoto>;
  /** Stripped JPEG bytes for the portal (`preview` = current rendering ≤1200 px; `original` = unedited, ≤2400 px). Audited for `original`. */
  file(actor: Actor, id: string, variant: "preview" | "original"): Promise<{ bytes: Uint8Array; mime: string }>;

  albums(actor: Actor, q: AdminGalleryAlbumsQuery): Promise<{ data: AdminGalleryAlbum[]; meta: PageMeta }>;
  album(actor: Actor, id: string): Promise<AdminGalleryAlbumDetail>;
  createAlbum(actor: Actor, body: GalleryAlbumCreate): Promise<AdminGalleryAlbum>;
  patchAlbum(actor: Actor, id: string, body: GalleryAlbumPatch): Promise<AdminGalleryAlbum>;

  /** WhatsApp: stores one photo as pending (no album yet). */
  intake(i: GalleryIntakeInput): Promise<GalleryIntakeResult>;
  /** WhatsApp: recent events (14 days, in scope) + draft/published albums the sender can file under, best match first. `match` = the single event held today/yesterday in scope, if any. */
  targets(actor: Actor): Promise<{ match: GalleryTarget | null; options: GalleryTarget[] }>;
  /** WhatsApp: files pending photos under an event (album created/reused) or album. Returns the album id. */
  assign(actor: Actor, photoIds: readonly string[], target: { kind: "event" | "album"; id: string }): Promise<string>;
  /** WhatsApp ("Not for the gallery"): removes the sender's still-pending WhatsApp photos and returns their bytes so the bot can send them to the review inbox. (Added by backend track.) */
  withdraw(actor: Actor, photoIds: readonly string[]): Promise<{ bytes: Uint8Array; name: string | null; caption: string | null }[]>;
}
