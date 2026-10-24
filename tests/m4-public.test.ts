// M4 backlog and public additions: approvedAt, /org/units, gathering occurrences,
// FormPayload.editable, the dev-simulator gate and the simulator round trip.
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { EventPublic, OrgUnit, Paged } from "@/contract";
import { resetEnvCache } from "@/server/env";
import { assertDevSimulator } from "@/server/http/dev-only";
import { EVENT } from "@/server/mock/fixtures";
import { GET as eventGet } from "@/app/api/v1/events/[id]/route";
import { mockServices } from "./support/services";
import { DEV_TOKENS, linkServices } from "./support/links";
import { waSetup, phone } from "./support/wa";

describe("EventPublic.approvedAt and centre", () => {
  it("sets approvedAt only for approved events and links the centre", async () => {
    const { svc } = mockServices();
    const approved = await svc.events.byId(EVENT.eyeCamp);
    expect(approved?.approvedAt).toBe("2026-10-20T05:30:00.000Z");
    expect(approved?.centre).toEqual({ slug: "mayur-vihar" });
    const planned = await svc.events.byId(EVENT.bloodPlanned);
    expect(planned?.approvedAt).toBeNull();
  });
});

describe("GET /org/units", () => {
  it("lists active districts, or the samithis of one district", async () => {
    const { svc } = mockServices();
    const districts = await svc.districts.units({ kind: "district" });
    expect(districts).toHaveLength(10);
    for (const d of districts) OrgUnit.parse(d);
    expect(districts[0].kind).toBe("district");
    const east = await svc.districts.units({ kind: "samithi", district: "east" });
    expect(east.map((u) => u.slug).sort()).toEqual(["east-1", "east-2", "east-3", "east-4", "east-5"]);
    expect(east.every((u) => u.kind === "samithi" && u.active)).toBe(true);
    const all = await svc.districts.units({ kind: "samithi" });
    expect(all.length).toBeGreaterThan(east.length);
    expect(await svc.districts.units({ kind: "samithi", district: "atlantis" })).toEqual([]);
  });
});

describe("centre gatherings in the calendar", () => {
  it("adds recurring rows with gath_<id>_<date> ids, centre slug and planned status", async () => {
    const { svc } = mockServices();
    const page = Paged(EventPublic).parse(await svc.events.list({ page: 1, pageSize: 100, from: "2026-10-26", to: "2026-11-01", district: "east" }));
    const gath = page.data.filter((e) => e.id.startsWith("gath_"));
    expect(gath.length).toBeGreaterThan(0);
    for (const g of gath) {
      expect(g.id).toMatch(/^gath_[A-Z0-9]+_\d{8}$/);
      expect(g).toMatchObject({ recurring: true, status: "planned", approvedAt: null, endsAt: null });
      expect(g.centre?.slug).toBeTruthy();
      expect(g.district.slug).toBe("east");
    }
    const days = gath.map((g) => g.id.slice(-8));
    expect(days.every((d) => d >= "20261026" && d <= "20261101")).toBe(true);
    // sorted with the one-off events
    const starts = page.data.map((e) => e.startsAt);
    expect([...starts].sort()).toEqual(starts);
    // filters apply: a seva type that is not a gathering kind has none
    const eye = await svc.events.list({ page: 1, pageSize: 100, sevaType: "eye", from: "2026-10-22" });
    expect(eye.data.some((e) => e.id.startsWith("gath_"))).toBe(false);
    const bhajan = await svc.events.list({ page: 1, pageSize: 100, sevaType: "bhajan", from: "2026-10-22" });
    expect(bhajan.data.some((e) => e.id.startsWith("gath_"))).toBe(true);
    // volunteer-needing views never show gatherings
    expect((await svc.events.list({ page: 1, pageSize: 100, needsVolunteers: true })).data.some((e) => e.id.startsWith("gath_"))).toBe(false);
  });

  it("pages across the merged feed and totals both kinds", async () => {
    const { svc } = mockServices();
    const all = await svc.events.list({ page: 1, pageSize: 100, from: "2026-10-22", to: "2026-11-10" });
    const p1 = await svc.events.list({ page: 1, pageSize: 10, from: "2026-10-22", to: "2026-11-10" });
    const p2 = await svc.events.list({ page: 2, pageSize: 10, from: "2026-10-22", to: "2026-11-10" });
    expect(p1.meta.total).toBe(all.data.length);
    expect([...p1.data, ...p2.data].map((e) => e.id)).toEqual(all.data.slice(0, 20).map((e) => e.id));
  });

  it("answers 404 for an occurrence id (the calendar links it to the centre page)", async () => {
    const { svc } = mockServices();
    const some = (await svc.events.list({ page: 1, pageSize: 10 })).data.find((e) => e.id.startsWith("gath_"))!;
    expect(await svc.events.byId(some.id)).toBeNull();
    const res = await eventGet(new NextRequest(`http://localhost/api/v1/events/${some.id}`), { params: Promise.resolve({ id: some.id }) });
    expect(res.status).toBe(404);
    const unknown = await eventGet(new NextRequest("http://localhost/api/v1/events/nope"), { params: Promise.resolve({ id: "nope" }) });
    expect(unknown.status).toBe(404);
  });
});

describe("FormPayload.editable for public links", () => {
  it("is false once the event is no longer planned or postponed", async () => {
    const t = linkServices();
    const tok = DEV_TOKENS["eye-public"];
    const info = await t.links.info(tok, null);
    t.advance(2000);
    const grant = (await t.links.startPublic(tok, { botToken: info.botChallenge ?? "" }))!;
    expect((await t.links.form(tok, grant.sessionToken, "en")).editable).toBe(true);
    const ev = (await t.repo.eventById(EVENT.eyePlanned))!;
    ev.status = "awaiting_report";
    expect((await t.links.form(tok, grant.sessionToken, "en")).editable).toBe(false);
    ev.status = "postponed";
    expect((await t.links.form(tok, grant.sessionToken, "en")).editable).toBe(true);
  });
});

describe("dev simulator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  it("is open for the console provider outside production, 404 otherwise", () => {
    resetEnvCache();
    expect(() => assertDevSimulator()).not.toThrow();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "x".repeat(40));
    resetEnvCache();
    expect(() => assertDevSimulator()).toThrowError(expect.objectContaining({ code: "NOT_FOUND" }));
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WHATSAPP_PROVIDER", "cloud");
    vi.stubEnv("WA_PHONE_NUMBER_ID", "1");
    vi.stubEnv("WA_ACCESS_TOKEN", "t");
    vi.stubEnv("WA_APP_SECRET", "s");
    vi.stubEnv("WA_VERIFY_TOKEN", "v");
    resetEnvCache();
    expect(() => assertDevSimulator()).toThrowError(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("keeps both directions per phone oldest first, and resets", async () => {
    const t = waSetup();
    const out = await t.say("+919812345680", "hello");
    expect(out[0].buttons?.map((b) => b.id)).toEqual(["lang:en", "lang:hi"]);
    await t.svc.wa.handle({ from: "+919812345680", text: null, replyId: "lang:en", media: null });
    // the console log needs the logged provider; the fake provider records in-memory, so read the stored side
    const msgs = await t.svc.wa.dev.messages("+919812345680");
    expect(msgs.filter((m) => m.dir === "in").map((m) => m.text)).toEqual(["hello", "[lang:en]"]);
    expect(msgs.map((m) => m.at)).toEqual([...msgs.map((m) => m.at)].sort());
    await t.svc.wa.dev.reset("+919812345680");
    expect(await t.svc.wa.dev.messages("+919812345680")).toEqual([]);
    // after a reset the language is asked again
    expect((await t.say("+919812345680", "hello"))[0].buttons?.[0].id).toBe("lang:en");
    expect(phone(1)).toBeTruthy();
  });
});
