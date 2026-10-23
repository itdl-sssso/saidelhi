// M6 centres + partners (and volunteers once added) on the in-memory repo.
import { describe, expect, it } from "vitest";
import { CENTRE, EVENT, PARTNER, SAMITHI, USER, devUserPhone } from "@/server/mock/fixtures";
import { apiErr, errCode, m6Setup } from "./support/m6";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);

describe("centres admin", () => {
  it("scopes the list and edits: samithi coordinator sees only their own centre", async () => {
    const t = m6Setup();
    const coordA = await t.actor(USER.coordA);
    const coordH = await t.actor(USER.coordH);
    const state = await t.actor(USER.stateC);
    const q = { page: 1, pageSize: 50 } as never;
    const mine = await t.svc.portal.centres.list(coordA, q);
    expect(mine.data.every((c) => c.samithi.id === SAMITHI.mayurVihar)).toBe(true);
    expect(mine.data.length).toBeGreaterThan(0);
    expect((await t.svc.portal.centres.list(state, q)).meta.total).toBeGreaterThanOrEqual(mine.meta.total);
    // another samithi's centre is a 404
    expect(await errCode(t.svc.portal.centres.get(coordH, CENTRE.mayurVihar))).toBe("NOT_FOUND");
    expect(await errCode(t.svc.portal.centres.patch(coordH, CENTRE.mayurVihar, { active: false, version: 1 }))).toBe("NOT_FOUND");
    // content editors manage all centres; translators none
    expect(await errCode(t.svc.portal.centres.get(await t.actor(USER.contentD), CENTRE.mayurVihar))).toBe("ok");
    expect(await errCode(t.svc.portal.centres.list(await t.actor(USER.translatorE), q))).toBe("FORBIDDEN");
  });

  it("patch bumps the version, replaces the schedule, audits, and the public page reflects it", async () => {
    const t = m6Setup();
    const coordA = await t.actor(USER.coordA);
    const c = await t.svc.portal.centres.get(coordA, CENTRE.mayurVihar);
    const saved = await t.svc.portal.centres.patch(coordA, c.id, {
      name: { en: "Mayur Vihar Sai Centre (new)", hi: c.name.hi },
      schedule: [{ day: 0, time: "10:30", kind: "bhajan", language: "hi" }],
      version: c.version,
    });
    expect(saved.version).toBe(c.version + 1);
    expect(saved.schedule).toEqual([{ day: 0, time: "10:30", kind: "bhajan", language: "hi" }]);
    expect(await errCode(t.svc.portal.centres.patch(coordA, c.id, { active: true, version: c.version }))).toBe("CONFLICT");
    const pub = await t.svc.centres.bySlug(c.slug);
    expect(pub?.name.en).toBe("Mayur Vihar Sai Centre (new)");
    const audit = await t.repo.portal.listAudit({ entity: "centre", limit: 10, offset: 0 });
    expect(audit.rows.some((r) => r.action === "centre.update")).toBe(true);
    // hiding removes it from the public page
    const hidden = await t.svc.portal.centres.patch(coordA, c.id, { active: false, version: saved.version });
    expect(hidden.active).toBe(false);
    expect(await t.svc.centres.bySlug(c.slug)).toBeNull();
  });

  it("refuses a portal user's phone as the centre number and creates with a unique slug", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const c = await t.svc.portal.centres.get(state, CENTRE.mayurVihar);
    const err = await apiErr(t.svc.portal.centres.patch(state, c.id, { contactPhone: devUserPhone(1), version: c.version }));
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fields?.contactPhone).toBeTruthy();
    const input = { samithiId: SAMITHI.mayurVihar, name: { en: "Mayur Vihar Sai Centre", hi: null }, address: { en: "Phase 1", hi: null } };
    const a = await t.svc.portal.centres.create(state, input);
    const b = await t.svc.portal.centres.create(state, input);
    expect(a.slug).toBe("mayur-vihar-sai-centre");
    expect(b.slug).toBe("mayur-vihar-sai-centre-2");
    // samithi coordinators cannot create for other samithis
    expect(await errCode(t.svc.portal.centres.create(await t.actor(USER.coordH), input))).toBe("NOT_FOUND");
  });

  it("stores photos by magic bytes under centres/<id>/ and refuses other files", async () => {
    const t = m6Setup();
    const coordA = await t.actor(USER.coordA);
    const media = await t.svc.portal.centres.uploadPhoto(coordA, CENTRE.mayurVihar, { name: "front.jpg", bytes: JPEG }, { alt: "Front door" });
    expect(media.url).toMatch(new RegExp(`^/media/centres/${CENTRE.mayurVihar}/[a-z0-9]+\\.jpg$`));
    expect(media).toMatchObject({ width: 800, height: 600, alt: { en: "Front door" } });
    const bad = await apiErr(t.svc.portal.centres.uploadPhoto(coordA, CENTRE.mayurVihar, { name: "x.jpg", bytes: new Uint8Array([1, 2, 3, 4]) }, { alt: "x" }));
    expect(bad.fields?.file).toBeTruthy();
  });
});

describe("partners admin", () => {
  it("lists with this year's events, edits with a version guard, and hides internal contact from public pages", async () => {
    const t = m6Setup();
    const dist = await t.actor(USER.districtB);
    const list = await t.svc.portal.partners.list(dist, { page: 1, pageSize: 50 } as never);
    const icare = list.data.find((p) => p.id === PARTNER.icare)!;
    expect(icare.eventsThisYear).toBeGreaterThan(0);
    expect(icare.showPublicly).toBe(true);
    // The public event shows the partner…
    expect((await t.svc.events.byId(EVENT.eyeCamp))?.partner).toEqual({ name: icare.name });
    const hid = await t.svc.portal.partners.patch(dist, icare.id, { showPublicly: false, contact: "Registrar office", version: icare.version });
    expect(hid.version).toBe(icare.version + 1);
    // …until it is switched off.
    expect((await t.svc.events.byId(EVENT.eyeCamp))?.partner).toBeNull();
    expect(await errCode(t.svc.portal.partners.patch(dist, icare.id, { active: false, version: icare.version }))).toBe("CONFLICT");
    // public program pages drop it
    const program = await t.svc.programs.byType("eye");
    expect(program?.partners.map((p) => p.id) ?? []).not.toContain(icare.id);
  });

  it("creates partners, rejects duplicate names, and enforces permission", async () => {
    const t = m6Setup();
    const editor = await t.actor(USER.contentD);
    const p = await t.svc.portal.partners.create(editor, { name: "New Eye Trust", kind: "hospital", city: "Delhi" });
    expect(p).toMatchObject({ name: "New Eye Trust", showPublicly: true, version: 1, eventsThisYear: 0 });
    expect(await errCode(t.svc.portal.partners.create(editor, { name: "new eye trust", kind: "ngo", city: "Noida" }))).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.partners.list(await t.actor(USER.coordA), { page: 1, pageSize: 10 } as never))).toBe("FORBIDDEN");
  });
});
