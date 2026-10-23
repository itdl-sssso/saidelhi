// M7 B1: discourse importer parsing + public services over the mock repo (synthetic placeholder text only).
import { describe, expect, it } from "vitest";
import { DiscourseDetail, DiscoursesPayload, DISCOURSE_CREDIT, DiscoursesQuery, VALUE_DISCOURSE_THEMES } from "@/contract";
import { locateQuote, parseIsoDate, slugFromFile, themesFor } from "@/server/domain/discourse";
import { parseDiscourse, uniqueSlug } from "@/server/domain/discourse-import";
import { mockServices } from "./support/services";

const q = (o: object = {}) => DiscoursesQuery.parse(o);

async function withFlag(on: boolean) {
  const m = mockServices();
  await m.repo.m6.setSetting("flags", { discourses: on, offline_mode: false, ai_extraction: false }, null);
  return m;
}

describe("discourse import parsing", () => {
  const catalog = {
    rows: [{ n: 7, occ: "Sample occasion", place: "Sample place", why: "Sample why" }],
    themes: { Character: [7], "Mental peace / emotions": [7, 9] },
  };
  const file = {
    n: 7,
    title: "Sample",
    coll: "Sample Vol 1",
    date: "04 October 1970",
    place: "",
    occasion: "",
    retrieved: "2026-10-19",
    quote_candidates: [
      { en: "line  two", hi: "दो" },
      { en: "not present", hi: null },
    ],
    blocks: [
      { id: "s1", type: "heading", en: "Head", hi: "शीर्षक" },
      { id: "s2", type: "verse", en: "line one\nline two", hi: "पंक्ति" },
      { id: "s3", type: "para", en: "empty one", hi: "" },
    ],
  };

  it("maps blocks, quotes, themes, dates and catalog fallbacks", () => {
    const d = parseDiscourse(file, "07-sample-talk.hi.json", catalog);
    expect(d.slug).toBe("sample-talk");
    expect(d.blocks.map((b) => b.type)).toEqual(["heading", "poem", "para"]);
    expect(d.blocks[2].hi).toBeNull();
    expect(d.blocks[1].hiAi).toBe("पंक्ति");
    expect(d.quotes).toEqual([
      { en: "line  two", hi: "दो", blockId: "s2" },
      { en: "not present", hi: null, blockId: null },
    ]);
    expect(d.themes).toEqual(["character", "mental_peace"]);
    expect(d.isoDate).toBe("1970-10-04");
    expect([d.place, d.occasion, d.whyEn]).toEqual(["Sample place", "Sample occasion", "Sample why"]);
  });

  it("caps imported quotes at 4", () => {
    const many = { ...file, quote_candidates: Array.from({ length: 9 }, (_, i) => ({ en: `q${i}`, hi: null })) };
    expect(parseDiscourse(many, "07-x.hi.json", catalog).quotes).toHaveLength(4);
  });

  it("parses only full dates and builds unique slugs", () => {
    expect(parseIsoDate("1966")).toBeNull();
    expect(parseIsoDate("May 1972")).toBeNull();
    expect(parseIsoDate("31 June 1972")).toBeNull();
    expect(parseIsoDate("1 Jan 1980")).toBe("1980-01-01");
    expect(slugFromFile("01-students.hi.json")).toBe("students");
    expect(uniqueSlug("students", 5, new Map([["students", 1]]))).toBe("students-5");
    expect(uniqueSlug("students", 1, new Map([["students", 1]]))).toBe("students");
    expect(themesFor(1, {})).toEqual([]);
    expect(locateQuote("", [{ id: "a", en: "x" }])).toBeNull();
  });
});

describe("public discourses (mock)", () => {
  it("is hidden while the flag is off", async () => {
    const { svc } = await withFlag(false);
    expect(await svc.discourses.list(q())).toBeNull();
    expect(await svc.discourses.bySlug("sample-students")).toBeNull();
    expect(await svc.discourses.exists("sample-students")).toBe(false);
    expect((await svc.values.bySlug("sathya")).discourses).toBeNull();
  });

  it("lists published only, with counts, credit and a featured quote", async () => {
    const { svc } = await withFlag(true);
    const p = (await svc.discourses.list(q()))!;
    expect(DiscoursesPayload.parse(p)).toBeTruthy();
    expect(p.items.map((i) => i.slug)).toEqual(["sample-students", "sample-peace", "sample-service"]);
    expect(p.themes).toHaveLength(14);
    expect(p.themes.find((t) => t.key === "character")!.count).toBe(2);
    expect(p.themes.find((t) => t.key === "habits")!.count).toBe(0); // only the unpublished draft has it
    expect(p.credit).toEqual(DISCOURSE_CREDIT);
    expect(p.featured?.quote.en).toBeTruthy();
    expect(p.items[0]).toHaveProperty("why");
  });

  it("filters by theme and by query, including the Hindi title", async () => {
    const { svc } = await withFlag(true);
    expect((await svc.discourses.list(q({ theme: "character" })))!.items.map((i) => i.n)).toEqual([1, 3]);
    expect((await svc.discourses.list(q({ q: "शान्ति" })))!.items.map((i) => i.slug)).toEqual(["sample-peace"]);
    expect((await svc.discourses.list(q({ q: "talk on service" })))!.items.map((i) => i.slug)).toEqual(["sample-service"]);
    expect((await svc.discourses.list(q({ theme: "habits" })))!.items).toEqual([]);
  });

  it("featured quote is stable within an IST day and rotates across days", async () => {
    const a = (await (await withFlag(true)).svc.discourses.list(q()))!.featured;
    const again = (await (await withFlag(true)).svc.discourses.list(q()))!.featured;
    expect(again).toEqual(a);
    const seen = new Set<string>();
    for (let d = 0; d < 6; d++) {
      const { repo } = await withFlag(true);
      const { createServices } = await import("@/server/services/create");
      const svc = createServices(repo, { now: () => new Date(Date.UTC(2026, 9, 22 + d, 8)), mediaBase: "/media" });
      seen.add((await svc.discourses.list(q()))!.featured!.quote.en);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("serves detail from the snapshot with related, value and credit; 404s unpublished", async () => {
    const { svc } = await withFlag(true);
    const d = (await svc.discourses.bySlug("sample-students"))!;
    expect(DiscourseDetail.parse(d)).toBeTruthy();
    expect(d.blocks.every((b) => b.hi)).toBe(true);
    expect(d.quotes.length).toBeGreaterThanOrEqual(2);
    expect(d.related.map((r) => r.slug)).toEqual(["sample-service"]); // shares "character"
    expect(d.value).toBe("sathya");
    expect(d.translation.reviewedBy).toBeNull();
    expect(d.credit).toEqual(DISCOURSE_CREDIT);
    expect(await svc.discourses.bySlug("sample-draft")).toBeNull();
    expect(await svc.discourses.bySlug("nope")).toBeNull();
    expect(await svc.discourses.exists("sample-peace")).toBe(true);
    expect(await svc.discourses.exists("sample-draft")).toBe(false);
  });

  it("keeps public text on the snapshot after the working copy changes", async () => {
    const { svc, repo } = await withFlag(true);
    const item = repo.discourses.items[0];
    item.blocks[1].hi = "बदला हुआ मसौदा";
    const d = (await svc.discourses.bySlug("sample-students"))!;
    expect(d.blocks[1].hi).not.toBe("बदला हुआ मसौदा");
  });

  it("fills Value pages with at most 3 published matches", async () => {
    const { svc } = await withFlag(true);
    const sathya = (await svc.values.bySlug("sathya")).discourses!;
    expect(sathya.map((s) => s.slug)).toEqual(["sample-students", "sample-service"]);
    expect(sathya.length).toBeLessThanOrEqual(3);
    for (const slug of Object.keys(VALUE_DISCOURSE_THEMES) as (keyof typeof VALUE_DISCOURSE_THEMES)[]) {
      expect((await svc.values.bySlug(slug)).discourses!.length).toBeLessThanOrEqual(3);
    }
    expect((await svc.values.bySlug("ahimsa")).discourses).toEqual([]); // only the unpublished draft matches
  });
});
