import { adminEndpoints } from "@/contract";
import type { AdminGalleryPhoto } from "@/contract";

/** Authenticated preview URL; `revision` busts the browser cache after an edit. */
export const previewSrc = (p: Pick<AdminGalleryPhoto, "id" | "revision" | "version">) => `${adminEndpoints.galleryPhotoFile(p.id, "preview")}&rev=${p.revision}`;
export const originalSrc = (id: string) => adminEndpoints.galleryPhotoFile(id, "original");

export type GalleryTab = "pending" | "approved" | "rejected" | "albums";
export const GALLERY_TABS = ["pending", "approved", "rejected", "albums"] as const satisfies readonly GalleryTab[];
export type PhotoCounts = Record<"pending" | "approved" | "rejected", number>;
