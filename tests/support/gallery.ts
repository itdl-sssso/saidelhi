import sharp from "sharp";
import type { Actor } from "@/server/auth/rbac";
import { EVENT, USER } from "@/server/mock/fixtures";
import { m6Setup } from "./m6";

export { EVENT, USER };

/** A JPEG that carries EXIF + GPS, to prove the pipeline strips it. */
export async function jpegWithGps(w = 400, h = 300, rgb: [number, number, number] = [200, 40, 40]): Promise<Uint8Array> {
  const buf = await sharp({ create: { width: w, height: h, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "secret-owner" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "28/1 36/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "77/1 12/1 0/1" } } })
    .toBuffer();
  return new Uint8Array(buf);
}

export const hasMarker = (b: Uint8Array, s = "secret-owner") => Buffer.from(b).includes(Buffer.from(s));

export async function gallerySetup() {
  const t = m6Setup();
  const a = {
    coord: await t.actor(USER.coordA),
    district: await t.actor(USER.districtB),
    otherDistrict: await t.actor(USER.districtG),
    otherCoord: await t.actor(USER.coordH),
    state: await t.actor(USER.stateC),
    editor: await t.actor(USER.contentD),
  } satisfies Record<string, Actor>;
  const g = t.svc.portal.gallery;
  const intake = async (actor: Actor, bytes?: Uint8Array, caption: string | null = null) =>
    g.intake({ actor, bytes: bytes ?? (await jpegWithGps()), name: "p.jpg", caption, senderMasked: "+91 ••••• •0001", conversationId: "c1" });
  return { ...t, a, g, intake };
}
