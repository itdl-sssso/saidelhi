import { describe, expect, it } from "vitest";
import { COPY, pick } from "@/server/whatsapp/bot/copy";
import { jpegWithGps } from "./support/gallery";
import { buttonIds, EVENT, phone, PUBLIC_PHONE, rowIds, texts, waSetup } from "./support/wa";

const photo = async (bytes?: Uint8Array) => ({ kind: "image" as const, name: "p.jpg", mime: "image/jpeg", bytes: bytes ?? (await jpegWithGps()) });
const pending = async (t: ReturnType<typeof waSetup>) => (await t.repo.m6.docList("gallery_photo", { k2: "pending" })).length;
const L = "en";

async function english(t: ReturnType<typeof waSetup>, n = 1) {
  await t.tap(phone(n), "lang:en");
}

describe("gallery intake by chat", () => {
  it("coordinator photo is stored pending and the bot offers the matched event first", async () => {
    const t = waSetup();
    await english(t);
    const out = await t.say(phone(1), "Eye camp", null, await photo());
    expect(await pending(t)).toBe(1);
    const ids = rowIds(out);
    expect(ids[0]).toBe("g:y");
    expect(ids).toContain(`g:e:${EVENT.narayanMayurOverdue}`);
    expect(ids.at(-1)).toBe("g:no");
    expect(ids.length).toBeLessThanOrEqual(10);
    const list = out[0].list!;
    expect(list.sections[0].rows.every((r) => r.title.length <= 24 && (r.description?.length ?? 0) <= 72)).toBe(true);
    expect(out[0].text).toContain("Eye screening camp, Mayur Vihar");
    // caption kept as EN caption
    const ph = (await t.repo.m6.docList<{ caption: { en: string } }>("gallery_photo"))[0];
    expect(ph.data.caption.en).toBe("Eye camp");
  });

  it("a batch of 3 photos files under one album with one assign", async () => {
    const t = waSetup();
    await english(t);
    await t.say(phone(1), null, null, await photo());
    const second = await t.say(phone(1), null, null, await photo());
    expect(texts(second)).toBe(pick(L, COPY.galleryAdded(2)));
    await t.say(phone(1), null, null, await photo());
    expect(await pending(t)).toBe(3);
    const done = await t.tap(phone(1), "g:y");
    expect(texts(done)).toContain(pick(L, COPY.galleryThanks(3)));
    const albums = await t.repo.m6.docList<{ eventId: string }>("gallery_album");
    expect(albums).toHaveLength(1);
    expect(albums[0].data.eventId).toBe(EVENT.eyeMayurCamp);
    const photos = await t.repo.m6.docList("gallery_photo", { k1: albums[0].id, k2: "pending" });
    expect(photos).toHaveLength(3);
    // flow ended: next photo starts a fresh batch and asks again
    const again = await t.say(phone(1), null, null, await photo());
    expect(rowIds(again)[0]).toBe("g:y");
    // choosing the existing album by event reuses it
    await t.tap(phone(1), "g:y");
    expect(await t.repo.m6.docList("gallery_album")).toHaveLength(1);
  });

  it("refuses non-coordinators, bad types, too-large files and missing bytes; nothing stored", async () => {
    const t = waSetup();
    await t.tap(PUBLIC_PHONE, "lang:en");
    expect(texts(await t.say(PUBLIC_PHONE, null, null, await photo()))).toBe(pick(L, COPY.galleryOnlyCoordinators));
    await english(t);
    expect(texts(await t.say(phone(1), null, null, { kind: "image", name: "x.jpg" }))).toBe(pick(L, COPY.galleryNoBytes));
    expect(texts(await t.say(phone(1), null, null, { kind: "image", name: "x.gif", bytes: new TextEncoder().encode("GIF89a not an image") }))).toBe(pick(L, COPY.galleryBadType));
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(texts(await t.say(phone(1), null, null, { kind: "image", name: "big.jpg", bytes: big }))).toBe(pick(L, COPY.galleryTooLarge));
    // a PNG header with no decodable image
    const fake = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(texts(await t.say(phone(1), null, null, { kind: "image", name: "bad.png", bytes: fake }))).toBe(pick(L, COPY.galleryBadType));
    expect(await pending(t)).toBe(0);
    expect(t.storage.files.size).toBe(0);
  });

  it("'Not for the gallery' sends the photos to the review inbox and removes the pending rows", async () => {
    const t = waSetup();
    await english(t);
    const before = (await t.repo.wa.listInbox({ state: "for_me" })).total;
    await t.say(phone(1), null, null, await photo());
    await t.say(phone(1), null, null, await photo());
    const out = await t.tap(phone(1), "g:no");
    expect(texts(out)).toContain(pick(L, COPY.sentToReview));
    expect(await pending(t)).toBe(0);
    const after = await t.repo.wa.listInbox({ state: "for_me" });
    expect(after.total).toBe(before + 2);
    expect(after.rows.filter((r) => r.mediaPath).length).toBeGreaterThanOrEqual(2);
    expect([...t.storage.files.keys()].some((k) => k.startsWith("gallery/orig/"))).toBe(false);
  });

  it("lists recent events and albums when nothing matches; text while waiting re-asks", async () => {
    const t = waSetup();
    await english(t, 7);
    const out = await t.say(phone(7), null, null, await photo());
    expect(rowIds(out)).not.toContain("g:y");
    expect(rowIds(out).at(-1)).toBe("g:no");
    const again = await t.say(phone(7), "the blood one");
    expect(texts(again)).toContain(pick(L, COPY.galleryPick));
    expect(await pending(t)).toBe(1);
    expect(buttonIds(again)).toEqual([]);
  });
});
