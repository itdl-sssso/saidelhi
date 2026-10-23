// M5 public P1: values, programs, join, districts index + demographics, centre pincode distance,
// redirects (rules + table), route handlers.
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  DistrictPayload,
  DistrictSummary,
  JoinPayload,
  isLegacyPath,
  legacyRedirect,
  ProgramCard,
  ProgramDetail,
  RedirectTarget,
  SevaType,
  ValuePayload,
  VALUE_ORDER,
} from "@/contract";
import { distanceKm, pincodeCentroid } from "@/server/domain/geo";
import { MockRepo } from "@/server/repo/mock";
import { createServices } from "@/server/services/create";
import { whatsappContact } from "@/server/services/join";
import { GET as valueGet } from "@/app/api/v1/values/[slug]/route";
import { GET as programGet } from "@/app/api/v1/programs/[type]/route";
import { GET as programsGet } from "@/app/api/v1/programs/route";
import { GET as joinGet } from "@/app/api/v1/join/route";
import { GET as districtsGet } from "@/app/api/v1/districts/route";
import { GET as redirectsGet } from "@/app/api/v1/redirects/route";
import { mockServices, NOW } from "./support/services";

describe("values", () => {
  it("returns all five slugs with a cycling prev/next", async () => {
    const { svc } = mockServices();
    for (const slug of VALUE_ORDER) {
      const v = ValuePayload.parse(await svc.values.bySlug(slug));
      expect(v.slug).toBe(slug);
      expect(v.upcoming.length).toBeLessThanOrEqual(3);
    }
    expect((await svc.values.bySlug("sathya")).prev).toBe("ahimsa");
    expect((await svc.values.bySlug("ahimsa")).next).toBe("sathya");
  });

  it("hides discourses when the flag is off", async () => {
    const { svc } = mockServices();
    expect((await svc.values.bySlug("shanti")).discourses).toBeNull();
  });

  it("counts centres holding the linked gathering and lists linked upcoming events", async () => {
    const { svc } = mockServices();
    const shanti = await svc.values.bySlug("shanti");
    const centres = shanti.facts.find((f) => f.key === "centres");
    expect(centres?.figure.value).toBeGreaterThan(0);
    expect(shanti.upcoming.every((e) => e.sevaType === "bhajan" || e.sevaType === "study_circle")).toBe(true);
    const prema = await svc.values.bySlug("prema");
    expect(prema.lived).toEqual({ sevaType: "narayan_seva", wing: "service" });
    expect(prema.facts.some((f) => f.key === "narayan.meals")).toBe(true);
  });

  it("rejects an unknown slug at the route", async () => {
    const res = await valueGet(new NextRequest("http://x/api/v1/values/nope"), { params: Promise.resolve({ slug: "nope" }) });
    expect(res.status).toBe(400);
    const ok = await valueGet(new NextRequest("http://x/api/v1/values/dharma"), { params: Promise.resolve({ slug: "dharma" }) });
    expect(ok.status).toBe(200);
  });
});

describe("programs", () => {
  it("lists active seva types with next event and this-year headline", async () => {
    const { svc } = mockServices();
    const cards = (await svc.programs.list({})).map((c) => ProgramCard.parse(c));
    const by = Object.fromEntries(cards.map((c) => [c.sevaType, c]));
    expect(by.eye.thisYear?.key).toBe("eye.screened");
    expect(by.blood.thisYear?.key).toBe("blood.units");
    expect(by.narayan_seva.thisYear?.key).toBe("narayan.meals");
    expect(by.narayan_seva.next).not.toBeNull();
    expect(by.eye.href).toBe("/programs/eye");
  });

  it("filters by wing", async () => {
    const { svc } = mockServices();
    const all = await svc.programs.list({});
    const service = await svc.programs.list({ wing: "service" });
    expect(service.length).toBeGreaterThan(0);
    expect(service.length).toBeLessThan(all.length);
    expect(service.every((c) => c.wing === "service")).toBe(true);
  });

  it("shows unreported eye funnel steps as null, never 0", async () => {
    const { svc } = mockServices();
    const eye = ProgramDetail.parse(await svc.programs.byType("eye"));
    expect(eye.funnel?.map((f) => f.key)).toEqual(["eye.cataract_found", "eye.cataract_referred", "eye.cataract_surgeries"]);
    expect(eye.funnel?.[0].figure.value).toBe(13);
    expect(eye.funnel?.[1].figure.value).toBeNull();
    expect(eye.kpis?.length).toBeGreaterThanOrEqual(3);
    expect(eye.kpis?.length).toBeLessThanOrEqual(4);
    expect(eye.upcoming.length).toBeLessThanOrEqual(6);
    // Falls back to hospital partners.
    expect(eye.partners.some((p) => p.kind === "hospital")).toBe(true);
  });

  it("has no funnel for non-eye types and falls back to blood banks", async () => {
    const { svc } = mockServices();
    const blood = await svc.programs.byType("blood");
    expect(blood?.funnel).toBeNull();
    expect(blood?.partners.some((p) => p.kind === "blood_bank")).toBe(true);
  });

  it("returns null kpis for a type with no data and null for an inactive type", async () => {
    const { repo, svc } = mockServices();
    const cleanliness = await svc.programs.byType("cleanliness");
    expect(cleanliness?.kpis).toBeNull();
    const rec = (await repo.sevaTypes()).find((s) => s.code === "cleanliness");
    if (rec) rec.active = false;
    expect(await svc.programs.byType("cleanliness")).toBeNull();
    expect(await svc.programs.exists("cleanliness")).toBe(false);
    expect(await svc.programs.exists("eye")).toBe(true);
  });

  it("routes: list ok, unknown type 400, inactive-or-missing 404", async () => {
    const list = await programsGet(new NextRequest("http://x/api/v1/programs?wing=service"));
    expect(list.status).toBe(200);
    const bad = await programGet(new NextRequest("http://x/api/v1/programs/zzz"), { params: Promise.resolve({ type: "zzz" }) });
    expect(bad.status).toBe(400);
    expect(SevaType.safeParse("eye").success).toBe(true);
  });
});

describe("join", () => {
  it("lists only public, non-recurring events with open slots, soonest first", async () => {
    const { svc } = mockServices();
    const j = JoinPayload.parse(await svc.join.get({ page: 1, pageSize: 12 }));
    expect(j.events.data.length).toBeGreaterThan(0);
    for (const e of j.events.data) {
      expect(e.recurring).toBe(false);
      expect(["planned", "postponed"]).toContain(e.status);
      expect(e.volunteersNeeded).not.toBeNull();
      expect(e.volunteersNeeded as number).toBeGreaterThan(e.volunteersJoined);
      expect(Date.parse(e.startsAt)).toBeGreaterThanOrEqual(NOW.getTime() - 24 * 3600 * 1000);
    }
    const times = j.events.data.map((e) => e.startsAt);
    expect([...times].sort()).toEqual(times);
    expect(j.events.meta.total).toBe(j.events.data.length);
  });

  it("combines district and seva type filters; unknown district is empty", async () => {
    const { svc } = mockServices();
    const all = await svc.join.get({ page: 1, pageSize: 50 });
    const blood = await svc.join.get({ page: 1, pageSize: 50, sevaType: "blood" });
    expect(blood.events.data.every((e) => e.sevaType === "blood")).toBe(true);
    expect(blood.events.data.length).toBeLessThan(all.events.data.length);
    const dist = all.events.data[0].district.slug;
    const both = await svc.join.get({ page: 1, pageSize: 50, district: dist, sevaType: all.events.data[0].sevaType });
    expect(both.events.data.length).toBeGreaterThan(0);
    expect(both.events.data.every((e) => e.district.slug === dist)).toBe(true);
    expect((await svc.join.get({ page: 1, pageSize: 12, district: "atlantis" })).events.data).toEqual([]);
  });

  it("pages and honours the from/to window", async () => {
    const { svc } = mockServices();
    const p1 = await svc.join.get({ page: 1, pageSize: 1 });
    expect(p1.events.data).toHaveLength(1);
    expect(p1.events.meta.total).toBeGreaterThan(1);
    const none = await svc.join.get({ page: 1, pageSize: 12, from: "2030-01-01" });
    expect(none.events.data).toEqual([]);
  });

  it("builds the WhatsApp contact: null without a number, wa.me with one", () => {
    expect(whatsappContact(undefined)).toEqual({ number: null, waMeUrl: null, keyword: "JOIN" });
    expect(whatsappContact({ number: null, keyword: "JOIN" }).waMeUrl).toBeNull();
    expect(whatsappContact({ number: "123", keyword: "JOIN" }).number).toBeNull();
    expect(whatsappContact({ number: "+91 98100 00000", keyword: "JOIN" })).toEqual({
      number: "+91 98100 00000",
      waMeUrl: "https://wa.me/919810000000?text=JOIN",
      keyword: "JOIN",
    });
  });

  it("payload carries the configured number", async () => {
    const repo = new MockRepo();
    const svc = createServices(repo, { now: () => NOW, mediaBase: "/media", whatsappPublic: { number: "+91 98100 00000", keyword: "HELLO" } });
    const j = await svc.join.get({ page: 1, pageSize: 12 });
    expect(j.whatsapp.waMeUrl).toBe("https://wa.me/919810000000?text=HELLO");
    const res = await joinGet(new NextRequest("http://x/api/v1/join?sevaType=blood"));
    expect(res.status).toBe(200);
  });
});

describe("districts index and demographics", () => {
  it("lists active districts with counts", async () => {
    const { svc } = mockServices();
    const list = (await svc.districts.list()).map((d) => DistrictSummary.parse(d));
    expect(list).toHaveLength(9);
    const east = list.find((d) => d.district.slug === "east");
    expect(east?.samithiCount).toBe(3);
    expect(east?.centreCount).toBe(3);
    const res = await districtsGet(new NextRequest("http://x/api/v1/districts"));
    expect(res.status).toBe(200);
  });

  it("fills demographics with <5 suppression, [] when none reported", async () => {
    const { svc } = mockServices();
    const east = DistrictPayload.parse(await svc.districts.bySlug("east"));
    const gender = east.demographics.find((d) => d.key === "gender");
    expect(gender?.bars.map((b) => [b.key, b.figure.value])).toEqual([["male", 48], ["female", 62]]);
    const age = east.demographics.find((d) => d.key === "age");
    expect(age?.bars[0].figure.value).toEqual({ lt5: true });
    const west = await svc.districts.bySlug("west");
    expect(west?.demographics).toEqual([]);
  });
});

describe("centres by pincode", () => {
  it("fills distanceKm and sorts nearest first for a known pincode", async () => {
    const { svc } = mockServices();
    const res = await svc.centres.list({ pincode: "110091", page: 1, pageSize: 100 });
    expect(res.data[0].slug).toBe("mayur-vihar");
    expect(res.data[0].distanceKm).toBeLessThan(1);
    const d = res.data.map((c) => c.distanceKm as number);
    expect(d.every((x) => typeof x === "number")).toBe(true);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(Math.max(...d)).toBeGreaterThan(10);
  });

  it("unknown pincode: nulls, name order", async () => {
    const { svc } = mockServices();
    const res = await svc.centres.list({ pincode: "999999", page: 1, pageSize: 100 });
    expect(res.data.every((c) => c.distanceKm === null)).toBe(true);
    const names = res.data.map((c) => c.name.en);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });

  it("no pincode: distanceKm stays null; haversine and table sanity", async () => {
    const { svc } = mockServices();
    const res = await svc.centres.list({ page: 1, pageSize: 100 });
    expect(res.data.every((c) => c.distanceKm === null)).toBe(true);
    expect(pincodeCentroid("110001")).not.toBeNull();
    expect(pincodeCentroid("000000")).toBeNull();
    const cp = pincodeCentroid("110001")!;
    expect(distanceKm(cp, cp)).toBe(0);
    // Connaught Place -> Gurugram Sector 31 area is roughly 25 km.
    const gg = pincodeCentroid("122001")!;
    expect(distanceKm(cp, gg)).toBeGreaterThan(20);
    expect(distanceKm(cp, gg)).toBeLessThan(35);
  });

  it("combines pincode with a text query", async () => {
    const { svc } = mockServices();
    const res = await svc.centres.list({ pincode: "110091", q: "noida", page: 1, pageSize: 100 });
    expect(res.data.map((c) => c.slug)).toEqual(["noida-sector-62"]);
    expect(res.data[0].distanceKm).toBeGreaterThan(5);
  });
});

describe("redirect rules", () => {
  const to = (p: string) => legacyRedirect(p)?.to ?? null;

  it("maps every Django pattern, with or without trailing slash and case", () => {
    expect(to("/about-us/")).toBe("/about");
    expect(to("/about-us")).toBe("/about");
    expect(to("/About-Us/")).toBe("/about");
    expect(to("/contact-us/")).toBe("/about#contact");
    expect(to("/get-involved/")).toBe("/join");
    expect(to("/book-auditorium/")).toBe("/about");
    expect(to("/saidelhi-backend/")).toBe("/admin");
    expect(to("/saidelhi-backend/postcontent/postcontent/")).toBe("/admin");
    expect(to("/wings/Service/")).toBe("/programs?wing=service");
    expect(to("/wings/Spiritual/")).toBe("/programs?wing=spiritual");
    expect(to("/wings/Education/")).toBe("/programs?wing=educational");
    expect(to("/wings/Unknown/")).toBe("/programs");
    expect(to("/content/News/getallposts/")).toBe("/news?c=news");
    expect(to("/content/Activities/getallposts/")).toBe("/news?c=activities");
    expect(to("/content/Centenary/getallposts/")).toBe("/news?c=centenary");
    expect(to("/content/Other/getallposts/")).toBe("/news");
    expect(to("/content/some-article-slug/")).toBe("/news/some-article-slug");
    expect(to("/content/some-article-slug/?utm_source=x")).toBe("/news/some-article-slug");
    expect(to("/content/a/b/c/")).toBeNull();
    expect(to("/events/x")).toBeNull();
    expect(legacyRedirect("/about-us")?.permanent).toBe(true);
  });

  it("recognises legacy paths for the moved page", () => {
    expect(isLegacyPath("/about-us/")).toBe(true);
    expect(isLegacyPath("/content/x/")).toBe(true);
    expect(isLegacyPath("/about")).toBe(false);
    expect(isLegacyPath("/news/x")).toBe(false);
  });
});

describe("redirects service", () => {
  it("table row wins over rules, counts hits, and falls back to rules", async () => {
    const repo = new MockRepo();
    repo.redirects.push({ fromPath: "/about-us", toPath: "/about#history", permanent: false, source: "manual", hits: 0 });
    let t = NOW.getTime();
    const svc = createServices(repo, { now: () => new Date(t), mediaBase: "/media" });
    expect(RedirectTarget.parse(await svc.redirects.resolve("/about-us/"))).toEqual({ to: "/about#history", permanent: false });
    await Promise.resolve();
    expect(repo.redirects[0].hits).toBe(1);
    expect(await svc.redirects.resolve("/get-involved/")).toEqual({ to: "/join", permanent: true });
    expect(await svc.redirects.resolve("/nothing/here")).toBeNull();
    // Cache expires after five minutes: a new row is then seen.
    repo.redirects.push({ fromPath: "/nothing/here", toPath: "/news", permanent: true, source: "migration", hits: 0 });
    expect(await svc.redirects.resolve("/nothing/here")).toBeNull();
    t += 6 * 60 * 1000;
    expect((await svc.redirects.resolve("/nothing/here"))?.to).toBe("/news");
  });

  it("route: 200 with target, 404 without, 400 without path", async () => {
    const ok = await redirectsGet(new NextRequest("http://x/api/v1/redirects?path=/about-us/"));
    expect(ok.status).toBe(200);
    expect((await ok.json()).data).toEqual({ to: "/about", permanent: true });
    expect((await redirectsGet(new NextRequest("http://x/api/v1/redirects?path=/zzz"))).status).toBe(404);
    expect((await redirectsGet(new NextRequest("http://x/api/v1/redirects"))).status).toBe(400);
  });
});
