// Thought of the day: rotation, official pull, images (v0.10).
import { describe, expect, it, vi } from "vitest";
import { USER } from "@/server/mock/fixtures";
import { istDate } from "@/server/domain/time";
import { parseLongDate, parseOfficialPage } from "@/server/services/portal/official-thought";
import { pickThoughtFor } from "@/server/services/thought";
import type { ContentItemRec } from "@/server/repo/types";
import { errCode, m6Setup } from "./support/m6";
import { NOW } from "./support/services";

const rec = (id: string, over: Partial<ContentItemRec> = {}): ContentItemRec => ({ id, kind: "thought_for_day", key: null, titleEn: null, titleHi: null, bodyEn: `T ${id}`, bodyHi: null, sourceEn: null, sourceHi: null, href: null, date: null, status: "published", sortOrder: 0, ...over });

const HTML = `<div class="views-row views-row-1 views-row-odd views-row-first quote">
  <div class="views-field views-field-field-date"><div class="field-content quote-title"><span  class="date-display-single">Wednesday, October 28, 2026</span></div></div>
  <div class="views-field views-field-field-quote-text">        <div class="field-content">Only the Divine is present within you, in you and around you. Bear in mind this basic and permanent truth. It&#039;s so.</div>  </div>
  <div class="views-field views-field-field-quote-reference">        <div class="field-content"><a href="https://saispeaks.sathyasai.org/discourse/avatar-love" target="_blank">Sri Sathya Sai Baba, October 18, 1991</a></div>  </div>  </div>
<div class="views-row views-row-2 quote">
  <div class="views-field views-field-field-date"><div class="field-content quote-title"><span  class="date-display-single">Tuesday, October 27, 2026</span></div></div>
  <div class="views-field views-field-field-quote-text"><div class="field-content">All work should be done with a pure heart filled with devotion, as in a clean vessel.</div></div>
  <div class="views-field views-field-field-quote-reference"><div class="field-content"><a href="https://evil.example/x">Sri Sathya Sai Baba, April 11, 1994</a></div></div></div>`;

describe("thought pick", () => {
  it("pool rotates deterministically by IST date; dated beats pool; official beats dated only with the flag", () => {
    const pool = [rec("a"), rec("b"), rec("c")];
    const d1 = pickThoughtFor(pool, "2026-10-28", false)!;
    const d2 = pickThoughtFor(pool, "2026-10-29", false)!;
    expect(d1.origin).toBe("pool");
    expect(d2.rec.id).not.toBe(d1.rec.id);
    expect(pickThoughtFor([...pool].reverse(), "2026-10-28", false)!.rec.id).toBe(d1.rec.id);
    const dated = rec("d", { date: "2026-10-28" });
    expect(pickThoughtFor([...pool, dated], "2026-10-28", false)!.rec.id).toBe("d");
    const off = rec("o", { key: "official", date: "2026-10-28" });
    expect(pickThoughtFor([...pool, dated, off], "2026-10-28", true)!.rec.id).toBe("o");
    expect(pickThoughtFor([...pool, dated, off], "2026-10-28", false)!.rec.id).toBe("d");
    expect(pickThoughtFor([rec("e", { date: "2026-10-01" })], "2026-10-28", false)!.origin).toBe("earlier");
    expect(pickThoughtFor([], "2026-10-28", true)).toBeNull();
  });
});

describe("official source parser", () => {
  it("reads dated rows, decodes entities, keeps only saispeaks links", () => {
    expect(parseLongDate("Wednesday, October 28, 2026")).toBe("2026-10-28");
    const rows = parseOfficialPage(HTML);
    expect(rows.map((r) => r.date)).toEqual(["2026-10-28", "2026-10-27"]);
    expect(rows[0].text).toContain("It's so.");
    expect(rows[0]).toMatchObject({ reference: "Sri Sathya Sai Baba, October 18, 1991", sourceUrl: "https://saispeaks.sathyasai.org/discourse/avatar-love" });
    expect(rows[1].sourceUrl).toBeNull();
    expect(parseOfficialPage("<html>nothing</html>")).toEqual([]);
  });
});

describe("thought service", () => {
  it("pool picture, official pull behind the flag, today() result", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    for (const c of await t.repo.m6.contentItemsAll("thought_for_day")) await t.repo.m6.contentItemUpdate(c.id, { status: "archived" }, c.version ?? 1);
    const mk = await t.svc.portal.content.create(ed, { kind: "item", type: "thought_for_day", body: { en: "Pool thought one", hi: "पूल विचार" }, image: { url: "/media/x.jpg", alt: { en: "Lamp", hi: null } } } as never);
    if (mk.kind !== "item") throw new Error("item");
    expect(mk.image).toMatchObject({ url: "/media/x.jpg" });
    expect(await errCode(t.svc.portal.content.create(ed, { kind: "item", type: "thought_for_day", body: { en: "Bad", hi: null }, image: { url: "javascript:x", alt: { en: "", hi: null } } } as never))).toBe("VALIDATION_FAILED");
    await t.svc.portal.content.patch(ed, mk.id, { status: "published", version: mk.version });
    expect((await t.svc.portal.content.thoughtPool(ed)).map((x) => x.id)).toContain(mk.id);

    const first = await t.svc.thought.today("en");
    expect(first).toMatchObject({ origin: "pool", image: { url: "/media/x.jpg" } });
    expect((await t.svc.thought.today("hi"))?.text).toBe("पूल विचार");

    // Official pull: nothing while the flag is off; once on, one fetch per day and it wins for today.
    const day = istDate(NOW);
    const long = new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
    const page = HTML.replace("Wednesday, October 28, 2026", long);
    const fetchSpy = vi.fn(async () => new Response(page, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    try {
      expect((await t.svc.portal.jobs.run("official-thought")).ids).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
      await t.repo.m6.setSetting("flags", { discourses: false, offline_mode: false, ai_extraction: false, thought_official: true }, null);
      const run1 = await t.svc.portal.jobs.run("official-thought");
      expect(run1.changed).toBe(1);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect((await t.svc.portal.jobs.run("official-thought")).changed).toBe(0);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const today = await t.svc.thought.today("en");
      expect(today).toMatchObject({ origin: "official", date: day, source: "Sri Sathya Sai Baba, October 18, 1991" });
      // Failure falls back to the rotation.
      await t.repo.m6.setSetting("flags", { discourses: false, offline_mode: false, ai_extraction: false, thought_official: false }, null);
      expect((await t.svc.thought.today("en"))?.origin).toBe("pool");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
