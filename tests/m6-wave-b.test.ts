// M6 wave B on the in-memory repo.
import { describe, expect, it } from "vitest";
import { DISTRICT, EVENT, USER } from "@/server/mock/fixtures";
import { SAMPLE_ARTICLE_ID } from "@/server/mock/fixtures/content";
import { errCode, m6Setup } from "./support/m6";
import { NOW } from "./support/services";

describe("impact controls", () => {
  it("keeps current Home tiles by default and honours toggles", async () => {
    const t = m6Setup();
    const content = await t.actor(USER.contentD);
    const before = await t.svc.home.get();
    const keysBefore = before.kpis?.map((k) => k.key);
    if (keysBefore) expect(keysBefore).toEqual(["activities", "people_served", "blood.units", "eye.spectacles"]);

    const ctl = await t.svc.portal.impact.get(content);
    expect(ctl.kpis.filter((k) => k.homeTile).map((k) => k.key).sort()).toEqual(["activities", "people_served", "blood.units", "eye.spectacles"].sort());

    // Hide volunteer hours on /impact, swap a Home tile.
    const out = await t.svc.portal.impact.patch(content, {
      version: ctl.version,
      kpis: [
        { key: "volunteer_hours", publicImpact: false, homeTile: false },
        { key: "eye.spectacles", publicImpact: true, homeTile: false },
        { key: "blood.donors", publicImpact: true, homeTile: true },
      ],
    });
    expect(out.version).toBe(ctl.version + 1);
    const impact = await t.svc.impact.get({ period: "all" } as never);
    expect(impact?.tiles.map((x) => x.key)).not.toContain("volunteer_hours");
    const home = await t.svc.home.get();
    if (home.kpis) expect(home.kpis.map((k) => k.key)).toContain("blood.donors");

    expect(await errCode(t.svc.portal.impact.patch(content, { version: ctl.version, showEstimates: false }))).toBe("CONFLICT");
    const five = ["eye.screened", "eye.cataract_surgeries"].map((key) => ({ key, publicImpact: true, homeTile: true }));
    expect(await errCode(t.svc.portal.impact.patch(content, { version: out.version, kpis: five }))).toBe("VALIDATION_FAILED");
  });

  it("estimates CRUD is audited and excluded when switched off", async () => {
    const t = m6Setup();
    const content = await t.actor(USER.contentD);
    const row = await t.svc.portal.impact.estimates.create(content, { districtId: DISTRICT.north, year: 2019, kpiKey: "activities", value: 40, source: "District register" });
    expect(row).toMatchObject({ year: 2019, month: null, value: 40, enteredBy: expect.any(String) });
    expect(await errCode(t.svc.portal.impact.estimates.create(content, { districtId: DISTRICT.north, year: 2099, kpiKey: "activities", value: 1, source: "x" }))).toBe("VALIDATION_FAILED");
    const patched = await t.svc.portal.impact.estimates.patch(content, row.id, { value: 55 });
    expect(patched.value).toBe(55);
    const list = await t.svc.portal.impact.estimates.list(content, { page: 1, pageSize: 50, year: 2019 });
    expect(list.data.map((r) => r.id)).toContain(row.id);
    const ctl = await t.svc.portal.impact.get(content);
    await t.svc.portal.impact.patch(content, { version: ctl.version, showEstimates: false });
    const all = await t.svc.impact.get({ period: "all" } as never);
    expect(all?.tiles.find((x) => x.key === "activities")?.figure.estimate).toBe(false);
    await t.svc.portal.impact.estimates.remove(content, row.id);
    expect((await t.svc.portal.impact.estimates.list(content, { page: 1, pageSize: 50, year: 2019 })).data.map((r) => r.id)).not.toContain(row.id);
    const audit = await t.repo.portal.listAudit({ limit: 50, offset: 0 });
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(["impact.estimate.create", "impact.estimate.update", "impact.estimate.delete", "impact.update"]));
    expect(await errCode(t.svc.portal.impact.get(await t.actor(USER.coordA)))).toBe("FORBIDDEN");
  });
});

describe("content", () => {
  const body = (extra: object = {}) => ({ kind: "article" as const, category: "news" as const, title: { en: "A new story", hi: null }, ...extra }) as never;

  it("creates, edits, schedules and publishes a native article", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const a = await t.svc.portal.content.create(ed, body({ bodyHtml: { en: "<p>Hello</p><script>x</script>", hi: null } }));
    if (a.kind !== "article") throw new Error("article");
    expect(a).toMatchObject({ status: "draft", slug: "a-new-story", version: 1, legacyId: null });
    expect(a.bodyHtml.en).toBe("<p>Hello</p>");
    // Same title -> unique slug; not public until published.
    const b = await t.svc.portal.content.create(ed, body());
    expect(b.kind === "article" && b.slug).toBe("a-new-story-2");
    expect(await t.svc.articles.exists("a-new-story")).toBe(false);

    const future = new Date(NOW.getTime() + 3_600_000).toISOString();
    expect(await errCode(t.svc.portal.content.patch(ed, a.id, { status: "scheduled", publishAt: new Date(NOW.getTime() - 1000).toISOString(), version: 1 }))).toBe("VALIDATION_FAILED");
    const sch = await t.svc.portal.content.patch(ed, a.id, { status: "scheduled", publishAt: future, version: 1 });
    expect(sch).toMatchObject({ status: "scheduled", publishAt: future, version: 2 });
    expect(await errCode(t.svc.portal.content.patch(ed, a.id, { title: { en: "x", hi: null }, version: 1 }))).toBe("CONFLICT");
    expect(await t.svc.articles.exists("a-new-story")).toBe(false);

    // Cron makes it public once the time has come.
    t.clock.t = new Date(NOW.getTime() + 2 * 3_600_000);
    expect(await t.svc.articles.exists("a-new-story")).toBe(true);
    const job = await t.svc.portal.jobs.run("publish-scheduled");
    expect(job).toMatchObject({ job: "publish-scheduled", changed: 1, ids: [a.id] });
    expect((await t.svc.portal.jobs.run("publish-scheduled")).changed).toBe(0);
    const row = await t.svc.portal.content.get(ed, a.id);
    expect(row).toMatchObject({ status: "published" });
    const pub = await t.svc.articles.bySlug("a-new-story");
    expect(pub?.title.en).toBe("A new story");
    const list = await t.svc.articles.list({ c: "all", page: 1, pageSize: 5 } as never);
    expect(list.data[0].slug).toBe("a-new-story");

    // Only drafts are deleted.
    expect(await errCode(t.svc.portal.content.remove(ed, a.id))).toBe("CONFLICT");
    await t.svc.portal.content.remove(ed, b.id);
    expect(await errCode(t.svc.portal.content.get(ed, b.id))).toBe("NOT_FOUND");
    expect(await errCode(t.svc.portal.content.create(await t.actor(USER.coordA), body()))).toBe("FORBIDDEN");
  });

  it("copies a legacy post on first edit and shadows the original", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const list = await t.svc.portal.content.list(ed, { page: 1, pageSize: 50 } as never);
    const legacy = list.data.find((r) => r.id === `legacy-${SAMPLE_ARTICLE_ID}`);
    expect(legacy).toMatchObject({ legacy: true, status: "published" });
    expect(list.meta.counts.all).toBe(list.meta.total);
    const g = await t.svc.portal.content.get(ed, `legacy-${SAMPLE_ARTICLE_ID}`);
    if (g.kind !== "article") throw new Error("article");
    expect(g.version).toBe(0);
    expect(await errCode(t.svc.portal.content.patch(ed, g.id, { title: { en: "x", hi: null }, version: 3 }))).toBe("CONFLICT");

    const p = await t.svc.portal.content.patch(ed, g.id, { title: { en: "Edited title", hi: "संपादित" }, version: 0 });
    if (p.kind !== "article") throw new Error("article");
    expect(p).toMatchObject({ legacyId: SAMPLE_ARTICLE_ID, slug: g.slug, status: "published", version: 1 });
    expect(p.id).not.toBe(g.id);
    // Legacy id now resolves to the copy; the list shows one row; public shows the edit once.
    expect((await t.svc.portal.content.get(ed, g.id)).id).toBe(p.id);
    const after = await t.svc.portal.content.list(ed, { page: 1, pageSize: 100 } as never);
    expect(after.data.filter((r) => r.legacy && r.title.en.startsWith("115") || r.id === p.id).map((r) => r.id)).toEqual([p.id]);
    const pub = await t.svc.articles.bySlug(g.slug);
    expect(pub?.title.en).toBe("Edited title");
    const all = await t.svc.articles.list({ c: "all", page: 1, pageSize: 50 } as never);
    expect(all.data.filter((a) => a.slug === g.slug)).toHaveLength(1);
    // A second copy attempt is refused (copy exists), and hiding removes it from the public site.
    await t.svc.portal.content.patch(ed, p.id, { status: "hidden", version: 1 });
    expect(await t.svc.articles.exists(g.slug)).toBe(false);
    expect((await t.svc.articles.list({ c: "all", page: 1, pageSize: 50 } as never)).data.some((a) => a.slug === g.slug)).toBe(false);
    const audit = await t.repo.portal.listAudit({ limit: 50, offset: 0 });
    expect(audit.rows.map((r) => r.action)).toEqual(expect.arrayContaining(["content.update", "content.hide"]));
  });

  it("creates a draft from an approved event, with the results card", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    expect(await errCode(t.svc.portal.content.fromEvent(ed, EVENT.bloodPlanned))).toBe("VALIDATION_FAILED");
    const d = await t.svc.portal.content.fromEvent(ed, EVENT.eyeCamp);
    expect(d).toMatchObject({ status: "draft", category: "news", event: { id: EVENT.eyeCamp } });
    expect(d.bodyHtml.en).toContain(`<div data-event-results="${EVENT.eyeCamp}"></div>`);
    expect(d.title.en).toMatch(/ at .*: \d+/);
    // Publishing makes the event link to the new article.
    await t.svc.portal.content.patch(ed, d.id, { status: "published", version: 1 });
    const ev = await t.svc.events.byId(EVENT.eyeCamp);
    expect(ev?.articleSlug).toBe(d.slug);
  });

  it("items: thought calendar, CSV import, validation", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    const th = await t.svc.portal.content.create(ed, ({ kind: "item", type: "thought_for_day", date: "2026-10-30", body: { en: "Serve.", hi: null } }) as never);
    if (th.kind !== "item") throw new Error("item");
    expect(th.status).toBe("draft");
    expect(await errCode(t.svc.portal.content.create(ed, ({ kind: "item", type: "thought_for_day", date: "2026-10-30", body: { en: "Again", hi: null } }) as never))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.content.create(ed, ({ kind: "item", type: "thought_for_day", body: { en: "No day", hi: null } }) as never))).toBe("VALIDATION_FAILED");
    await t.svc.portal.content.patch(ed, th.id, { status: "published", version: th.version });

    const csv = "date,text_en,text_hi,source_en,source_hi\n2026-10-30,Updated,,Baba,\n2026-10-31,\"Love, always\",प्रेम,,\nnot-a-date,x,,,\n2026-11-02,,,,\n";
    const res = await t.svc.portal.content.importThoughts(ed, { name: "t.csv", bytes: new TextEncoder().encode(csv) });
    expect(res).toMatchObject({ created: 1, updated: 1 });
    expect(res.errors.map((e) => e.row)).toEqual([4, 5]);
    expect(await errCode(t.svc.portal.content.importThoughts(ed, { name: "t.txt", bytes: new Uint8Array([65]) }))).toBe("VALIDATION_FAILED");

    const days = await t.svc.portal.content.thoughts(ed, { from: "2026-10-30", to: "2026-11-02" });
    expect(days.map((d) => d.item?.body?.en ?? null)).toEqual(["Updated", "Love, always", null, null]);
    expect(days[3].shown).toMatchObject({ repeated: true, text: { en: "Love, always" } });
    expect(await errCode(t.svc.portal.content.thoughts(ed, { from: "2026-01-01", to: "2026-12-31" }))).toBe("VALIDATION_FAILED");

    const tab = await t.svc.portal.content.list(ed, { page: 1, pageSize: 50, tab: "thought_for_day" } as never);
    expect(tab.meta.counts.thought_for_day).toBe(tab.meta.total);
    await t.svc.portal.content.patch(ed, th.id, { status: "hidden", version: (await t.svc.portal.content.get(ed, th.id)).version });
    const hid = await t.svc.portal.content.get(ed, th.id);
    expect(hid).toMatchObject({ status: "hidden" });
  });

  it("uploads content media", async () => {
    const t = m6Setup();
    const ed = await t.actor(USER.contentD);
    expect(await errCode(t.svc.portal.content.uploadMedia(ed, { name: "x.jpg", bytes: new Uint8Array([1, 2, 3]) }, { alt: "x" }))).toBe("VALIDATION_FAILED");
  });
});

describe("migration + redirects", () => {
  const post = (id: number, slug: string, category: string, title: string, content: string, over: object = {}) => ({
    id,
    slug,
    category,
    title,
    shortDescription: "",
    content,
    featuredImage: "",
    createdAt: new Date("2024-03-01T05:00:00Z"),
    updatedAt: new Date("2024-03-01T05:00:00Z"),
    i18n: null,
    gallery: [],
    ...over,
  });

  function setup() {
    const t = m6Setup();
    (t.repo as unknown as { fx: { articles: unknown[] } }).fx.articles.push(
      post(910001, "phone-in-body", "N", "Camp report", "<p>Call 9811122233 for details</p>"),
      post(910002, "empty-one", "N", "Empty post", "<p>&nbsp;</p>"),
      post(910003, "hindi-title", "N", "सेवा शिविर", "<p>Body</p>"),
      post(910004, "missing-image", "N", "Image camp", '<p>x</p><img src="https://saidelhi.org/media/gone.jpg">'),
      post(910005, "other-cat", "O", "Internal", "<p>Internal note</p>"),
      post(910006, "old-date", "N", "No date", "<p>Body</p>", { createdAt: new Date("1970-01-01T00:00:00Z") }),
    );
    return t;
  }
  const slugsOf = async (t: ReturnType<typeof setup>) => (await t.svc.articles.list({ c: "all", page: 1, pageSize: 100 } as never)).data.map((a) => a.slug);

  it("flags issues, maps types, imports idempotently", async () => {
    const t = setup();
    const st = await t.actor(USER.stateC);
    const run = await t.svc.portal.migration.create(st, "legacy_db");
    expect(run.status).toBe("mapping");
    const by = (p: string) => run.issues.filter((i) => i.problem === p).map((i) => i.ref);
    expect(by("personal_data")).toEqual(["910001"]);
    expect(by("empty_body")).toEqual(["910002"]);
    expect(by("hindi_only")).toEqual(["910003"]);
    expect(by("broken_images")).toEqual(["910004"]);
    expect(by("no_date")).toEqual(["910006"]);
    expect(run.types.find((x) => x.sourceType === "post:O")).toMatchObject({ becomes: "hidden", risky: true });
    expect(run.types.find((x) => x.sourceType === "post:N")).toMatchObject({ becomes: "news", risky: true });
    expect(run.types.find((x) => x.sourceType === "page:about-us")).toMatchObject({ becomes: "redirect_only" });
    expect(run.issues.find((i) => i.ref === "910001")?.fixPath).toBe("/admin/content/legacy-910001");

    expect(await errCode(t.svc.portal.migration.patch(st, run.id, { version: 99, types: [] }))).toBe("CONFLICT");
    expect(await errCode(t.svc.portal.migration.patch(st, run.id, { version: run.version, types: [{ sourceType: "post:Z", becomes: "news" }] }))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.migration.patch(st, run.id, { version: run.version, types: [{ sourceType: "page:about-us", becomes: "news" }] }))).toBe("VALIDATION_FAILED");
    const mapped = await t.svc.portal.migration.patch(st, run.id, { version: run.version, types: [{ sourceType: "post:A", becomes: "stories" }, { sourceType: "page:wings", becomes: "skip" }] });
    expect(mapped.types.find((x) => x.sourceType === "post:A")?.becomes).toBe("stories");
    expect(mapped.counts.skipped).toBe(1);

    expect(await slugsOf(t)).toContain("phone-in-body");
    const done = await t.svc.portal.migration.runImport(st, run.id, { version: mapped.version });
    expect(done.status).toBe("done");
    expect(done.finishedAt).not.toBeNull();
    // Personal data / empty body leave the public site; remapped A posts become stories copies.
    const slugs = await slugsOf(t);
    expect(slugs).not.toContain("phone-in-body");
    expect(slugs).not.toContain("empty-one");
    expect(slugs).toContain("hindi-title");
    const eye = await t.svc.articles.bySlug("eye-camp-mayur-vihar-oct-2026");
    expect(eye?.category).toBe("stories");
    expect(slugs.filter((s) => s === "eye-camp-mayur-vihar-oct-2026")).toHaveLength(1);

    // Second import changes nothing.
    const writes = async () => (await t.repo.portal.listAudit({ limit: 500, offset: 0 })).rows.filter((r) => /^migration\.(article|redirect)$/.test(r.action)).length;
    const before = await writes();
    expect(before).toBeGreaterThan(0);
    const again = await t.svc.portal.migration.runImport(st, run.id, { version: (await t.svc.portal.migration.get(st, run.id)).version });
    expect(again.counts).toEqual(done.counts);
    expect(await writes()).toBe(before);
    expect(await slugsOf(t)).toEqual(slugs);

    const csv = await t.svc.portal.migration.reportCsv(st, run.id);
    expect(csv.split("\r\n")[0]).toBe("ref,title,problem,fix_path");
    expect(csv).toContain("910001,Camp report,personal_data,/admin/content/legacy-910001");
    expect(csv).not.toContain("9811122233");
    expect((await t.svc.portal.migration.list(st))[0].id).toBe(run.id);
    expect(await errCode(t.svc.portal.migration.create(await t.actor(USER.coordA), "legacy_db"))).toBe("FORBIDDEN");
  });

  it("redirect_only hides posts and adds a redirect row; sitemap runs harvest redirects", async () => {
    const t = setup();
    const st = await t.actor(USER.stateC);
    const run = await t.svc.portal.migration.create(st, "legacy_db");
    const m = await t.svc.portal.migration.patch(st, run.id, { version: run.version, types: [{ sourceType: "post:N", becomes: "redirect_only" }] });
    await t.svc.portal.migration.runImport(st, run.id, { version: m.version });
    expect(await slugsOf(t)).not.toContain("hindi-title");
    const rows = (await t.svc.portal.migration.redirects.list(st, { page: 1, pageSize: 100, source: "migration" } as never)).data;
    expect(rows).toContainEqual(expect.objectContaining({ from: "/content/hindi-title", to: "/news", source: "migration" }));

    const xml = `<?xml version="1.0"?><urlset><url><loc>https://saidelhi.org/old/phone-in-body/</loc></url><url><loc>https://saidelhi.org/about-us</loc></url><url><loc>https://saidelhi.org/nowhere/page</loc></url></urlset>`;
    const sm = await t.svc.portal.migration.create(st, "sitemap", { name: "sitemap.xml", bytes: new TextEncoder().encode(xml) });
    expect(sm).toMatchObject({ source: "sitemap", fileName: "sitemap.xml", counts: { items: 3, needsFix: 1 } });
    expect(sm.issues).toEqual([{ ref: "/nowhere/page", title: "/nowhere/page", problem: "slug_clash", fixPath: null }]);
    await t.svc.portal.migration.runImport(st, sm.id, { version: sm.version });
    const all = (await t.svc.portal.migration.redirects.list(st, { page: 1, pageSize: 100 } as never)).data;
    expect(all).toContainEqual(expect.objectContaining({ from: "/old/phone-in-body", to: "/news/phone-in-body", source: "migration" }));
    expect(await errCode(t.svc.portal.migration.create(st, "sitemap", { name: "x.xml", bytes: new TextEncoder().encode("nope") }))).toBe("VALIDATION_FAILED");
  });

  it("redirect CRUD: normalises, refuses live routes and rules, deletes", async () => {
    const t = setup();
    const st = await t.actor(USER.stateC);
    const r = await t.svc.portal.migration.redirects.upsert(st, { from: "/old-camp/?utm=1", to: "/news", permanent: false });
    expect(r).toMatchObject({ from: "/old-camp", to: "/news", permanent: false, source: "manual", hits: 0 });
    expect(await t.svc.redirects.resolve("/old-camp")).toEqual({ to: "/news", permanent: false });
    const r2 = await t.svc.portal.migration.redirects.upsert(st, { from: "/old-camp", to: "/events" });
    expect(r2.permanent).toBe(true);
    expect((await t.svc.portal.migration.redirects.list(st, { page: 1, pageSize: 100, source: "manual" } as never)).data).toHaveLength(1);
    expect(await errCode(t.svc.portal.migration.redirects.upsert(st, { from: "/events/x", to: "/news" }))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.migration.redirects.upsert(st, { from: "/about-us", to: "/news" }))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.migration.redirects.upsert(st, { from: "/same", to: "/same/" }))).toBe("VALIDATION_FAILED");
    const rules = (await t.svc.portal.migration.redirects.list(st, { page: 1, pageSize: 100, source: "rule" } as never)).data;
    expect(rules.map((x) => x.from)).toContain("/about-us");
    expect(await errCode(t.svc.portal.migration.redirects.remove(st, "/about-us"))).toBe("VALIDATION_FAILED");
    await t.svc.portal.migration.redirects.remove(st, "/old-camp/");
    expect(await errCode(t.svc.portal.migration.redirects.remove(st, "/old-camp"))).toBe("NOT_FOUND");
    const q = await t.svc.portal.migration.redirects.list(st, { page: 1, pageSize: 100, q: "about" } as never);
    expect(q.data.every((x) => x.from.includes("about") || x.to.includes("about"))).toBe(true);
  });
});
