// M3 portal on the in-memory repo: auth, RBAC scope, lifecycle, people rule, KPI flattening, escalation, audit.
import { describe, expect, it } from "vitest";
import { ImpactPayload } from "@/contract";
import { ApiError } from "@/server/http/errors";
import { EVENT, devUserPhone, USER, SAMITHI, NCR_ID } from "@/server/mock/fixtures";
import { createServices } from "@/server/services/create";
import { MockRepo } from "@/server/repo/mock";
import { FakeWhatsApp } from "./support/links";
import { NOW } from "./support/services";

function setup(now: Date = NOW) {
  const repo = new MockRepo();
  const whatsapp = new FakeWhatsApp();
  const clock = { t: now };
  const svc = createServices(repo, { now: () => clock.t, mediaBase: "/media", whatsapp });
  const rc = { requestId: "t", ipHash: null };
  const actor = async (userId: string) => (await svc.auth.actorFor(userId, rc))!;
  const tile = async (key: string) => {
    const i = ImpactPayload.parse(await svc.impact.get({ period: "this_year" }));
    const v = i.tiles.find((t) => t.key === key)!.figure.value;
    return typeof v === "number" ? v : 0;
  };
  return { repo, svc, whatsapp, clock, actor, tile, rc };
}

const code = async (e: unknown) => (e instanceof ApiError ? e.code : "other");
const fails = async (p: Promise<unknown>) => p.then(() => "ok", code);

describe("auth", () => {
  it("answers neutrally for unknown numbers, signs in, slides, and logs out", async () => {
    const t = setup();
    const known = await t.svc.auth.requestOtp(devUserPhone(2), "whatsapp", "en");
    const unknown = await t.svc.auth.requestOtp("+919999999999", "whatsapp", "en");
    expect(Object.keys(unknown)).toEqual(Object.keys(known));
    expect(t.whatsapp.sent).toHaveLength(1);
    const { me, grant } = await t.svc.auth.verify(devUserPhone(2), t.whatsapp.lastCode(), { ...t.rc, ipHash: null, userAgent: null }, "en");
    expect(me.role).toBe("district_coord");
    expect(me.user.phone).not.toContain("9000000002");
    const s1 = await t.svc.auth.resolve(grant.token, t.rc);
    expect(s1?.renewed).toBeNull();
    t.clock.t = new Date(NOW.getTime() + 6 * 86400_000);
    const s2 = await t.svc.auth.resolve(grant.token, t.rc);
    expect(s2?.renewed).not.toBeNull(); // slid 6 days in: still valid
    t.clock.t = new Date(NOW.getTime() + 12 * 86400_000);
    expect(await t.svc.auth.resolve(grant.token, t.rc)).not.toBeNull(); // 6 days after the slide
    await t.svc.auth.logout(grant.token, t.rc);
    expect(await t.svc.auth.resolve(grant.token, t.rc)).toBeNull();
  });

  it("expires after 7 idle days and rejects a wrong code", async () => {
    const t = setup();
    await t.svc.auth.requestOtp(devUserPhone(2), "whatsapp", "en");
    expect(await fails(t.svc.auth.verify(devUserPhone(2), "000000", { ...t.rc, userAgent: null }, "en"))).toBe("VALIDATION_FAILED");
    const { grant } = await t.svc.auth.verify(devUserPhone(2), t.whatsapp.lastCode(), { ...t.rc, userAgent: null }, "en");
    t.clock.t = new Date(NOW.getTime() + 8 * 86400_000);
    expect(await t.svc.auth.resolve(grant.token, t.rc)).toBeNull();
  });
});

describe("RBAC", () => {
  it("returns 404 out of scope, 403 without the permission", async () => {
    const t = setup();
    const coordA = await t.actor(USER.coordA);
    expect(await fails(t.svc.portal.events.get(coordA, EVENT.balVikasRohiniEscalated))).toBe("NOT_FOUND");
    expect((await t.svc.portal.events.get(coordA, EVENT.narayanMayurOverdue)).id).toBe(EVENT.narayanMayurOverdue);
    expect(await fails(t.svc.portal.audit.list(coordA, {} as never))).toBe("FORBIDDEN");
    expect(await fails(t.svc.portal.events.act(coordA, EVENT.eyeMayurPlan, "approve-plan", {}))).toBe("FORBIDDEN");
    const other = await t.actor(USER.districtG); // North district
    expect(await fails(t.svc.portal.events.get(other, EVENT.eyeMayurPlan))).toBe("NOT_FOUND");
  });

  it("district coordinators assign roles at or below their own, inside their district", async () => {
    const t = setup();
    const east = await t.actor(USER.districtB);
    const base = { name: "New Person", email: null, locale: "en" as const };
    const ok = await t.svc.portal.people.invite(east, { ...base, phone: "9876500001", role: "samithi_coord", scopeId: SAMITHI.laxmiNagar });
    expect(ok.role).toBe("samithi_coord");
    expect(await fails(t.svc.portal.people.invite(east, { ...base, phone: "9876500003", role: "samithi_coord", scopeId: SAMITHI.rohini }))).toMatch(/FORBIDDEN|NOT_FOUND|VALIDATION_FAILED/);
    expect(await fails(t.svc.portal.people.invite(east, { ...base, phone: "9876500004", role: "state_admin", scopeId: NCR_ID }))).toBe("FORBIDDEN");
  });

  it("deactivating a person kills their sessions", async () => {
    const t = setup();
    await t.svc.auth.requestOtp(devUserPhone(8), "whatsapp", "en");
    const { grant } = await t.svc.auth.verify(devUserPhone(8), t.whatsapp.lastCode(), { ...t.rc, userAgent: null }, "en");
    expect(await t.svc.auth.resolve(grant.token, t.rc)).not.toBeNull();
    const east = await t.actor(USER.districtB);
    const p = await t.svc.portal.people.deactivate(east, USER.coordH, {});
    expect(p.status).toBe("deactivated");
    expect(await t.svc.auth.resolve(grant.token, t.rc)).toBeNull();
  });
});

describe("event lifecycle", () => {
  it("walks the happy path and rejects illegal moves with 409", async () => {
    const t = setup();
    const coord = await t.actor(USER.coordA);
    const east = await t.actor(USER.districtB);
    const ev = await t.svc.portal.events.get(coord, EVENT.cleanMayurDraft);
    expect(ev.status).toBe("draft");
    expect(await fails(t.svc.portal.events.act(east, EVENT.cleanMayurDraft, "approve-report", {}))).toBe("CONFLICT");
    expect(await fails(t.svc.portal.events.act(east, EVENT.cleanMayurDraft, "postpone", {}))).toBe("CONFLICT");
    const planned = await t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "approve-plan", {});
    expect(planned.status).toBe("planned");
    expect(planned.timeline.at(-1)?.status).toBe("planned");
    expect(await fails(t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "approve-plan", {}))).toBe("CONFLICT");
    const postponed = await t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "postpone", { postponedTo: "2026-12-01T04:30:00.000Z" });
    expect(postponed.status).toBe("postponed");
    expect(await fails(t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "reopen", {}))).toBe("FORBIDDEN");
    const state = await t.actor(USER.stateC);
    expect((await t.svc.portal.events.act(state, EVENT.eyeMayurPlan, "reopen", {})).status).toBe("planned");
    expect((await t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "cancel", { reason: "venue unavailable" })).status).toBe("cancelled");
  });

  it("approve-plan sends the report link; approve-report flattens KPIs and moves the impact figures", async () => {
    const t = setup();
    const east = await t.actor(USER.districtB);
    const before = await t.tile("people_served");
    await t.svc.portal.events.act(east, EVENT.eyePreetReport, "approve-report", {});
    expect(await t.tile("people_served")).toBeGreaterThan(before);
    expect((await t.svc.portal.events.get(east, EVENT.eyePreetReport)).status).toBe("approved");
    t.whatsapp.sent.length = 0;
    await t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "approve-plan", {});
    expect(t.whatsapp.sent.some((m) => m.template === "form_link_sent")).toBe(true);
    const links = (await t.svc.portal.events.get(east, EVENT.eyeMayurPlan)).links;
    expect(links.map((l) => l.purpose).sort()).toEqual(["desk", "public", "report"]);
  });

  it("records a self-approval when a district coordinator submits their own event", async () => {
    const t = setup();
    const east = await t.actor(USER.districtB);
    const made = await t.svc.portal.events.create(
      east,
      {
        sevaType: "eye",
        title: { en: "Eye camp", hi: "नेत्र शिविर" },
        startsAt: "2026-12-05T04:30:00.000Z",
        endsAt: null,
        samithiId: SAMITHI.laxmiNagar,
        venueName: "Hall",
        venueAddress: "",
        geo: null,
        partnerId: null,
        volunteersNeeded: null,
        bring: [],
        description: { en: "Free screening.", hi: "निःशुल्क जाँच।" },
        recurring: false,
        submit: false,
      },
      "en",
    );
    expect(made.status).toBe("draft");
    const done = await t.svc.portal.events.act(east, made.id, "submit", {});
    expect(done.status).toBe("planned");
    const rows = await t.svc.portal.events.list(east, { status: "planned", page: 1, pageSize: 100 } as never);
    expect(rows.data.find((r) => r.id === made.id)?.selfApproved).toBe(true);
  });
});

describe("escalation job", () => {
  it("escalates stale approvals once (idempotent) and audits", async () => {
    const t = setup(new Date("2026-10-23T08:00:00Z"));
    const first = await t.svc.portal.jobs.run("escalations");
    expect(first.changed).toBeGreaterThan(0);
    const second = await t.svc.portal.jobs.run("escalations");
    expect(second.changed).toBe(0);
    const state = await t.actor(USER.stateC);
    const ev = await t.svc.portal.events.get(state, EVENT.medicalSaketPlan);
    expect(ev.status).toBe("escalated");
    expect(t.repo.portal.audit.some((a) => a.action === "event.escalate")).toBe(true);
  });
});

describe("audit", () => {
  it("writes an entry for every mutation", async () => {
    const t = setup();
    const east = await t.actor(USER.districtB);
    const n = t.repo.portal.audit.length;
    await t.svc.portal.events.act(east, EVENT.eyeMayurPlan, "approve-plan", {});
    const added = t.repo.portal.audit.slice(n);
    expect(added.some((a) => a.action === "event.approve-plan" && a.actorId === USER.districtB)).toBe(true);
  });
});
