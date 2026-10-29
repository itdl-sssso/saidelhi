import { describe, expect, it } from "vitest";
import {
  ArticleDetail,
  CentreDetail,
  DistrictPayload,
  EventPublic,
  type Figure,
  HomePayload,
  ImpactPayload,
  type KpiTile,
  Paged,
  Article,
  CentreListItem,
} from "@/contract";
import { legacyLettersFor, mapLegacyCategory, sanitizeBody } from "@/server/domain/articles";
import { publicCount, toFigure } from "@/server/domain/kpi";
import { EVENT } from "@/server/mock/fixtures";
import { mockServices } from "./support/services";

const tileByKey = (tiles: readonly KpiTile[] | null, key: string): Figure => {
  const t = tiles?.find((x) => x.key === key);
  if (!t) throw new Error(`tile ${key} missing`);
  return t.figure;
};

describe("kpi rules", () => {
  it("suppresses 1–4 only when the KPI counts people", () => {
    expect(publicCount(0, true)).toBe(0);
    expect(publicCount(1, true)).toEqual({ lt5: true });
    expect(publicCount(4, true)).toEqual({ lt5: true });
    expect(publicCount(5, true)).toBe(5);
    expect(publicCount(3, false)).toBe(3);
  });

  it("null stays null, 0 stays 0", () => {
    expect(toFigure([], { suppress: true })).toEqual({ value: null, estimate: false });
    expect(toFigure([null, null], { suppress: true })).toEqual({ value: null, estimate: false });
    expect(toFigure([0], { suppress: true })).toEqual({ value: 0, estimate: false });
    expect(toFigure([null, 7], { suppress: true, estimate: true })).toEqual({ value: 7, estimate: true });
  });
});

describe("events service (mock)", () => {
  it("shows the approved eye camp with the spec sample results", async () => {
    const { svc } = mockServices();
    const ev = EventPublic.parse(await svc.events.byId(EVENT.eyeCamp));
    expect(ev.status).toBe("approved");
    expect(ev.partner).toEqual({ name: "ICARE Eye Hospital" });
    expect(ev.centreContact).toMatch(/^\+91/);
    expect(ev.articleSlug).toBe("eye-camp-mayur-vihar-oct-2026");
    const r = ev.results!;
    expect(r.tiles.map((t) => [t.key, t.figure.value])).toEqual([
      ["eye.screened", 115],
      ["eye.spectacles", 63],
      ["eye.cataract_found", 13],
    ]);
    expect(r.breakdowns[0].bars.map((b) => [b.label, b.figure.value])).toEqual([
      ["+1.0", 12],
      ["+1.5", 10],
      ["+2.0", 20],
      ["+2.5", 14],
      ["+3.0", 7],
    ]);
    expect(r.followUp).toMatchObject({ done: 0, of: 13 });
  });

  it("never exposes results before approval", async () => {
    const { svc } = mockServices();
    for (const id of [EVENT.medicalAwaitingReport, EVENT.cleanlinessSubmitted, EVENT.bloodPlanned, EVENT.cleanlinessCancelled]) {
      const ev = await svc.events.byId(id);
      expect(ev).not.toBeNull();
      expect(ev!.results).toBeNull();
    }
  });

  it("hides non-public statuses", async () => {
    const { svc } = mockServices();
    for (const id of [EVENT.draft, EVENT.awaitingApproval, EVENT.escalated]) expect(await svc.events.byId(id)).toBeNull();
    expect(await svc.events.byId("nope")).toBeNull();
    const all = await svc.events.list({ page: 1, pageSize: 100, from: "2020-01-01" });
    const statuses = new Set(all.data.map((e) => e.status));
    for (const s of ["draft", "awaiting_approval", "escalated"]) expect(statuses.has(s as never)).toBe(false);
  });

  it("lists upcoming by default, sorted, with filters and paging", async () => {
    const { svc } = mockServices();
    const page = Paged(EventPublic).parse(await svc.events.list({ page: 1, pageSize: 3 }));
    // 7 one-off events plus the weekly gatherings of the next four weeks (recurring rows).
    const everything = await svc.events.list({ page: 1, pageSize: 100 });
    expect(everything.data.filter((e) => !e.id.startsWith("gath_"))).toHaveLength(7);
    expect(page.meta).toEqual({ page: 1, pageSize: 3, total: everything.data.length });
    const starts = page.data.map((e) => e.startsAt);
    expect([...starts].sort()).toEqual(starts);
    expect(starts.every((s) => s >= "2026-10-22")).toBe(true);

    const east = await svc.events.list({ page: 1, pageSize: 25, district: "east", from: "2026-01-01" });
    expect(east.data.every((e) => e.district.slug === "east")).toBe(true);
    const needs = await svc.events.list({ page: 1, pageSize: 25, needsVolunteers: true });
    expect(needs.data.every((e) => e.volunteersNeeded !== null && e.volunteersNeeded > e.volunteersJoined)).toBe(true);
    expect((await svc.events.list({ page: 1, pageSize: 25, district: "atlantis" })).data).toEqual([]);
  });
});

describe("impact service (mock)", () => {
  it("returns a contract-valid payload with approved data only", async () => {
    const { svc } = mockServices();
    const impact = ImpactPayload.parse(await svc.impact.get({ period: "this_year" }));
    // 25 volunteer hours on the report_submitted event must not count.
    expect(tileByKey(impact.tiles, "volunteer_hours")).toEqual({ value: 132, estimate: false });
    // 5 approved events this year + 3 estimated (South, Jan 2026).
    expect(tileByKey(impact.tiles, "activities")).toEqual({ value: 8, estimate: true });
    expect(impact.tiles.find((t) => t.key === "people_served")?.note?.en).toMatch(/more than once/);
    expect(impact.recent).toHaveLength(5);
    expect(impact.recent.every((e) => e.status === "approved")).toBe(true);
    expect(impact.trend).toHaveLength(12);
    expect(impact.trend.find((t) => t.month === "2026-01")?.figure).toEqual({ value: 3, estimate: true });
  });

  it("suppresses counts under 5", async () => {
    const { svc } = mockServices();
    const impact = (await svc.impact.get({ period: "this_year" }))!;
    const medical = impact.bySevaType.find((s) => s.sevaType === "medical")!;
    expect(medical.figures.find((f) => f.key === "medical.patients")?.figure.value).toEqual({ lt5: true });
    const faridabad = impact.byDistrict.find((d) => d.district.slug === "faridabad")!;
    expect(faridabad.peopleServed.value).toEqual({ lt5: true });
    expect(faridabad.activities.value).toBe(1);
  });

  it("uses null for not reported, never 0", async () => {
    const { svc } = mockServices();
    const impact = (await svc.impact.get({ period: "this_year", district: "faridabad" }))!;
    expect(tileByKey(impact.tiles, "volunteer_hours").value).toBeNull();
    const north = impact.byDistrict.find((d) => d.district.slug === "north")!;
    expect(north.peopleServed.value).toBeNull();
    expect(north.activities.value).toBe(0);
    const eye = (await svc.impact.get({ period: "this_year" }))!.bySevaType.find((s) => s.sevaType === "eye")!;
    expect(eye.figures.find((f) => f.key === "eye.cataract_surgeries")?.figure.value).toBe(0);
  });

  it("filters by period and district; unknown district → null", async () => {
    const { svc } = mockServices();
    const last = (await svc.impact.get({ period: "last_year", district: "west" }))!;
    expect(last.period).toMatchObject({ key: "last_year", from: "2025-01-01", to: "2025-12-31" });
    expect(tileByKey(last.tiles, "people_served")).toEqual({ value: 80, estimate: false });
    expect(await svc.impact.get({ period: "this_year", district: "atlantis" })).toBeNull();
    const all = (await svc.impact.get({ period: "all" }))!;
    expect(all.period.from).toBeNull();
  });
});

describe("home, centres, districts (mock)", () => {
  it("home matches the contract and the spec samples", async () => {
    const { svc } = mockServices();
    const home = HomePayload.parse(await svc.home.get());
    expect(home.thought?.date).toBe("2026-10-22");
    expect(home.upcoming.length).toBeGreaterThan(0);
    expect(home.upcoming.every((e) => e.status === "planned")).toBe(true);
    expect(home.kpis?.map((k) => k.key)).toEqual(["activities", "people_served", "blood.units", "eye.spectacles"]);
    expect(tileByKey(home.kpis, "eye.spectacles").value).toBe(63);
    expect(home.articles).toHaveLength(3);
    expect(home.centenary.every((a) => a.category.startsWith("centenary"))).toBe(true);
    expect(home.wings).toHaveLength(5);
  });

  it("home hides KPI tiles when nothing is approved yet", async () => {
    const { svc } = mockServices(new Date("2024-03-01T00:00:00Z"));
    expect((await svc.home.get()).kpis).toBeNull();
  });

  it("centres list/search and detail", async () => {
    const { svc } = mockServices();
    const all = Paged(CentreListItem).parse(await svc.centres.list({ page: 1, pageSize: 100 }));
    expect(all.meta.total).toBe(62); // 11 dev centres + 42 real samithi pins (dev-hung samithis skipped) + 9 map buildings
    const hit = await svc.centres.list({ page: 1, pageSize: 100, q: "MAYUR" });
    expect(hit.data.map((c) => c.slug)).toEqual(["mayur-vihar"]);
    expect((await svc.centres.list({ page: 1, pageSize: 100, q: "110091" })).data).toHaveLength(1);
    expect((await svc.centres.list({ page: 1, pageSize: 100, district: "east" })).meta.total).toBe(5);

    const mv = CentreDetail.parse(await svc.centres.bySlug("mayur-vihar"));
    expect(mv.schedule.map((g) => g.day)).toEqual([0, 4, 6]);
    expect(mv.nextGathering?.kind).toBe("bhajan"); // Thu 18:30 IST, later the same day
    expect(mv.past.map((e) => e.id)).toContain(EVENT.eyeCamp);
    expect(tileByKey(mv.thisYear, "people_served").value).toBe(115);

    const quiet = await svc.centres.bySlug("lodhi-road");
    expect(quiet?.thisYear).toBeNull();
    expect(await svc.centres.bySlug("atlantis")).toBeNull();
  });

  it("district page", async () => {
    const { svc } = mockServices();
    const east = DistrictPayload.parse(await svc.districts.bySlug("east"));
    expect(east.samithiCount).toBe(5);
    expect(east.centres).toHaveLength(5);
    expect(east.intro?.hi).toBeTruthy();
    expect(DistrictPayload.parse(await svc.districts.bySlug("north")).kpis).toBeNull();
    expect(await svc.districts.bySlug("mayur-vihar")).toBeNull();
  });
});

describe("articles (mock)", () => {
  it("maps every legacy category letter", () => {
    expect(["N", "A", "C", "D", "K", "S", "P"].map(mapLegacyCategory)).toEqual([
      "news",
      "activities",
      "centenary_national",
      "centenary_state",
      "key_programs",
      "special_programs",
      "stories",
    ]);
    expect(mapLegacyCategory("n")).toBe("news");
    expect(mapLegacyCategory("?")).toBe("news");
    expect(legacyLettersFor("centenary")).toEqual(["C", "D"]);
    expect(legacyLettersFor("all")).toBeUndefined();
    expect(legacyLettersFor("stories")).toEqual(["P"]);
  });

  it("sanitises legacy HTML", () => {
    const html = sanitizeBody('<h1>T</h1><p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><a href="https://a.b">y</a><p> </p>');
    expect(html).not.toMatch(/script|onclick|javascript:|<h1/);
    expect(html).toContain("<h2>T</h2>");
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("lists by category, hides hidden posts, Hindi null when absent", async () => {
    const { svc } = mockServices();
    const all = Paged(Article).parse(await svc.articles.list({ c: "all", page: 1, pageSize: 50 }));
    expect(all.data.map((a) => a.slug)).not.toContain("hidden-legacy-post");
    const cent = await svc.articles.list({ c: "centenary", page: 1, pageSize: 50 });
    expect(new Set(cent.data.map((a) => a.category))).toEqual(new Set(["centenary_national", "centenary_state"]));
    const news = await svc.articles.list({ c: "news", page: 1, pageSize: 50 });
    expect(news.data.every((a) => a.title.hi === null && a.bodyHtml.hi === null)).toBe(true);
    expect(await svc.articles.bySlug("hidden-legacy-post")).toBeNull();
  });

  it("detail includes Hindi, prev/next/related and the linked event", async () => {
    const { svc } = mockServices();
    const a = ArticleDetail.parse(await svc.articles.bySlug("eye-camp-mayur-vihar-oct-2026"));
    expect(a.category).toBe("activities");
    expect(a.title.hi).toMatch(/नेत्र/);
    expect(a.bodyHtml.en).not.toContain("<script");
    expect(a.district?.slug).toBe("east");
    expect(a.event?.id).toBe(EVENT.eyeCamp);
    expect(a.next).toBeNull();
    expect(a.prev?.slug).toBe("new-website-launch");
    expect(a.related.every((r) => r.category === "activities" && r.slug !== a.slug)).toBe(true);
  });
});

describe("privacy + flags (mock)", () => {
  it("stores the request and audits without personal data", async () => {
    const { svc, repo } = mockServices();
    const { id } = await svc.privacy.createRequest(
      { name: "Test Person", phone: "+91 90000-00000", type: "deletion", details: "" },
      { requestId: "req-1", ipHash: null },
    );
    expect(id).toHaveLength(26);
    expect(repo.privacyRequests[0]).toMatchObject({ id, phone: "+919000000000", locale: "en" });
    expect(repo.privacyRequests[0].dueAt.toISOString()).toBe("2026-11-21T08:00:00.000Z");
    expect(JSON.stringify(repo.audit[0])).not.toMatch(/Test Person|90000/);
  });

  it("discourses flag is off", async () => {
    const { svc } = mockServices();
    expect(await svc.flags.flags()).toEqual({ discourses: false, offline_mode: false, ai_extraction: false, thought_official: false });
  });
});
