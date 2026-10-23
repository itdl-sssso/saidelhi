// M6 wave A on the in-memory repo: settings, forms builder + publish gate, RBAC for the new permissions.
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { builderChecks, excelColumns, type FormDefinition, LINK_DEFAULTS } from "@/contract";
import { permissionsFor } from "@/server/auth/rbac";
import { FORM_IDS } from "@/server/forms/definitions";
import { EVENT, USER } from "@/server/mock/fixtures";
import { apiErr, errCode, m6Setup } from "./support/m6";

const EYE = FORM_IDS.templates.eye;

describe("RBAC for M6 permissions", () => {
  it("matches the plan", () => {
    expect(permissionsFor("district_coord")).toEqual(expect.arrayContaining(["forms.read", "partners.manage"]));
    expect(permissionsFor("district_coord")).not.toContain("forms.manage");
    expect(permissionsFor("content_editor")).toContain("centres.manage");
    expect(permissionsFor("samithi_coord")).not.toContain("forms.read");
    expect(permissionsFor("state_admin")).toEqual(expect.arrayContaining(["forms.manage", "privacy.read", "settings.manage"]));
    expect(permissionsFor("pii_officer")).not.toContain("settings.manage");
  });
});

describe("settings", () => {
  it("patches flags with audit, 409 on a stale version, and drives new link expiry", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const before = await t.svc.portal.settings.get(state);
    expect(before.links).toEqual(LINK_DEFAULTS);
    const next = await t.svc.portal.settings.patch(state, { flags: { discourses: true }, links: { reportLinkDays: 30 }, version: before.version });
    expect(next.flags.discourses).toBe(true);
    expect(next.version).toBe(before.version + 1);
    expect(await errCode(t.svc.portal.settings.patch(state, { flags: { offline_mode: true }, version: before.version }))).toBe("CONFLICT");
    const audit = await t.svc.portal.audit.list(state, { page: 1, pageSize: 50, action: "settings.flags" } as never);
    expect(audit.data.length).toBeGreaterThan(0);
    // the district can neither read nor change settings
    expect(await errCode(t.svc.portal.settings.get(await t.actor(USER.districtB)))).toBe("FORBIDDEN");

    // New report links expire at event end (else start) + reportLinkDays.
    const ev = (await t.repo.eventById(EVENT.eyePlanned))!;
    const { link } = await t.svc.links.createLink(EVENT.eyePlanned, "report", { label: "Test report" });
    const base = (ev.endsAt ?? ev.startsAt).getTime();
    expect(Math.round((Date.parse(link.expiresAt) - base) / 86_400_000)).toBe(30);
  });

  it("uses the OTP attempts/lock settings", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const s = await t.svc.portal.settings.get(state);
    await t.svc.portal.settings.patch(state, { links: { otpMaxAttempts: 3 }, version: s.version });
    expect((await t.svc.portal.settings.get(state)).links.otpMaxAttempts).toBe(3);
  });

  it("lists UI strings, filters missing Hindi, and rejects placeholder mismatches", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const all = await t.svc.portal.settings.strings.list(state, { page: 1, pageSize: 5000 } as never);
    expect(all.meta.total).toBeGreaterThan(100);
    const missing = await t.svc.portal.settings.strings.list(state, { page: 1, pageSize: 5000, missing: true } as never);
    expect(missing.data.every((r) => r.hi === null)).toBe(true);
    expect(missing.meta.total).toBeLessThanOrEqual(all.meta.total);
    const withPlaceholder = all.data.find((r) => /\{\w+\}/.test(r.en));
    expect(withPlaceholder).toBeDefined();
    const err = await apiErr(t.svc.portal.settings.strings.patch(state, { key: withPlaceholder!.key, hi: "बिना प्लेसहोल्डर" }));
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fields?.hi).toBeTruthy();
    const plain = all.data.find((r) => !/[{<]/.test(r.en))!;
    const ok = await t.svc.portal.settings.strings.patch(state, { key: plain.key, hi: "नया पाठ" });
    expect(ok).toMatchObject({ hi: "नया पाठ", overridden: true });
    expect((await t.svc.portal.settings.overrides("hi"))[plain.key]).toBe("नया पाठ");
    const reset = await t.svc.portal.settings.strings.patch(state, { key: plain.key, hi: null });
    expect(reset.overridden).toBe(false);
  });

  it("edits KPI definitions with a version guard and seva types with a published template", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const kpis = await t.svc.portal.settings.kpis.list(state);
    const k = kpis.find((x) => x.key === "eye.spectacles")!;
    const patched = await t.svc.portal.settings.kpis.patch(state, k.key, { publicImpact: false, version: k.version });
    expect(patched.publicImpact).toBe(false);
    expect(patched.version).toBe(k.version + 1);
    expect(await errCode(t.svc.portal.settings.kpis.patch(state, k.key, { publicImpact: true, version: k.version }))).toBe("CONFLICT");
    const types = await t.svc.portal.settings.sevaTypes.list(state);
    const eye = types.find((s) => s.code === "eye")!;
    expect(await errCode(t.svc.portal.settings.sevaTypes.patch(state, "eye", { templateId: FORM_IDS.templates.blood, version: eye.version }))).toBe("VALIDATION_FAILED");
    const set = await t.svc.portal.settings.sevaTypes.patch(state, "eye", { templateId: EYE, version: eye.version });
    expect(set.template?.id).toBe(EYE);
  });
});

describe("forms", () => {
  async function draftFromPublished(t: ReturnType<typeof m6Setup>) {
    const state = await t.actor(USER.stateC);
    const detail = await t.svc.portal.forms.detail(state, EYE);
    const def = structuredClone(detail.published!);
    return { state, detail, def };
  }

  it("lists templates, hides drafts and editing from districts", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const dist = await t.actor(USER.districtB);
    const s = await t.svc.portal.forms.list(state);
    expect(s.can).toEqual({ build: true, requestChange: false });
    expect(s.templates.find((x) => x.id === EYE)).toMatchObject({ current: { version: 1 }, draft: null, active: true });
    const d = await t.svc.portal.forms.list(dist);
    expect(d.can).toEqual({ build: false, requestChange: true });
    expect(await errCode(t.svc.portal.forms.create(dist, { title: { en: "X", hi: null }, sevaType: null }))).toBe("FORBIDDEN");
    expect(await errCode(t.svc.portal.forms.list(await t.actor(USER.coordA)))).toBe("FORBIDDEN");
  });

  it("builds a draft, blocks publish until Hindi is complete, and keeps live links on the old version", async () => {
    const t = m6Setup();
    const { state, detail, def } = await draftFromPublished(t);
    expect(detail.published?.version).toBe(1);
    // live link on v1
    const { link } = await t.svc.links.createLink(EVENT.eyePlanned, "report", {});
    const lockedVersion = (await t.repo.links.linkById(link.id))!.formVersionId;

    // new draft with a field missing Hindi
    const added = { id: "extra_note", kind: "number" as const, label: { en: "Extra", hi: null }, required: false, locked: false, min: 0, max: 10 };
    def.sections[1].fields.push(added as never);
    const created = await t.svc.portal.forms.patchDraft(state, EYE, { definition: def, version: null });
    expect(created.draft?.version).toBe(2);
    expect(created.version).toBe(1);

    const err = await apiErr(t.svc.portal.forms.publish(state, EYE, created.version!));
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fields).toHaveProperty("extra_note");

    // fix Hindi and publish
    const fixed = structuredClone(created.draft!);
    fixed.sections[1].fields.find((f) => f.id === "extra_note")!.label.hi = "अतिरिक्त";
    const saved = await t.svc.portal.forms.patchDraft(state, EYE, { definition: fixed, version: created.version });
    expect(saved.version).toBe(2);
    // stale rev → conflict
    expect(await errCode(t.svc.portal.forms.patchDraft(state, EYE, { definition: fixed, version: 1 }))).toBe("CONFLICT");
    const pub = await t.svc.portal.forms.publish(state, EYE, saved.version!);
    expect(pub.template.current?.version).toBe(2);
    expect(pub.draft).toBeNull();
    expect(pub.versions.map((v) => v.version)).toEqual([2, 1]);
    // existing link keeps v1
    expect((await t.repo.links.linkById(link.id))!.formVersionId).toBe(lockedVersion);
    expect((await t.repo.links.versionById(lockedVersion))!.version).toBe(1);
  });

  it("rejects removing a locked core field", async () => {
    const t = m6Setup();
    const { state, def } = await draftFromPublished(t);
    def.sections[0].fields = def.sections[0].fields.filter((f) => f.id !== "volunteers");
    const err = await apiErr(t.svc.portal.forms.patchDraft(state, EYE, { definition: def, version: null }));
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.fields).toHaveProperty("volunteers");
  });

  it("rejects duplicate field ids", async () => {
    const t = m6Setup();
    const { state, def } = await draftFromPublished(t);
    def.sections[1].fields.push({ ...def.sections[0].fields[1] });
    expect((await apiErr(t.svc.portal.forms.patchDraft(state, EYE, { definition: def, version: null }))).code).toBe("VALIDATION_FAILED");
  });

  it("creates an empty draft with core fields that passes structure checks except Hindi", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const d = await t.svc.portal.forms.create(state, { title: { en: "Medical camp report", hi: "चिकित्सा शिविर रिपोर्ट" }, sevaType: "medical" });
    expect(d.draft?.sections[0].fields.map((f) => f.id)).toEqual(expect.arrayContaining(["samithi", "date", "venue", "volunteers", "volunteer_hours"]));
    const checks = builderChecks(d.draft!, { purpose: "report" });
    expect(checks.find((c) => c.key === "core_fields")?.ok).toBe(true);
    const dup = await t.svc.portal.forms.duplicate(state, d.template.id, { title: { en: "Copy", hi: null } });
    expect(dup.template.id).not.toBe(d.template.id);
    expect(dup.draft?.version).toBe(1);
  });

  it("dry-run test returns errors, warnings and KPI facts without writing", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const bad = await t.svc.portal.forms.test(state, EYE, { answers: {}, locale: "en" });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.errors).length).toBeGreaterThan(0);
    const ok = await t.svc.portal.forms.test(state, EYE, {
      answers: { samithi: "x", date: "2026-10-01", venue: "School hall", volunteers: 5, volunteer_hours: 20, registered: 10, spectacles_total: 0 },
      locale: "en",
    });
    expect(ok.kpis.find((k) => k.key === "eye.screened")?.value).toBe(10);
  });

  it("change requests: district creates, state decides once", async () => {
    const t = m6Setup();
    const dist = await t.actor(USER.districtB);
    const state = await t.actor(USER.stateC);
    const r = await t.svc.portal.forms.createChangeRequest(dist, EYE, { text: "Add a question on glaucoma", urgency: "month" });
    expect(r).toMatchObject({ status: "open", urgency: "month" });
    expect((await t.svc.portal.forms.list(dist)).changeRequests).toHaveLength(1);
    expect((await t.svc.portal.forms.list(await t.actor(USER.districtG))).changeRequests).toHaveLength(0);
    expect(await errCode(t.svc.portal.forms.decideChangeRequest(dist, r.id, { status: "declined" }))).toBe("FORBIDDEN");
    const done = await t.svc.portal.forms.decideChangeRequest(state, r.id, { status: "drafted", note: "Started" });
    expect(done.status).toBe("drafted");
    expect(await errCode(t.svc.portal.forms.decideChangeRequest(state, r.id, { status: "declined" }))).toBe("CONFLICT");
  });

  it("builds an xlsx template with the expected headers, prefilled samithi and validation", async () => {
    const t = m6Setup();
    const state = await t.actor(USER.stateC);
    const detail = await t.svc.portal.forms.detail(state, EYE);
    const samithi = (await t.repo.orgUnits()).find((u) => u.kind === "samithi")!;
    const file = await t.svc.portal.forms.templateXlsx(state, EYE, { samithi: samithi.id });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(file.bytes) as never);
    const ws = wb.getWorksheet("Report")!;
    const headers = (ws.getRow(1).values as unknown[]).slice(1);
    expect(headers).toEqual(excelColumns(detail.published as FormDefinition).map((c) => c.header));
    expect(ws.getRow(2).getCell(1).value).toBe(samithi.code);
    expect(wb.getWorksheet("Help")).toBeDefined();
  });
});
