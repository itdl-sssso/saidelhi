// M6 uploads on the in-memory repo: parse, validate, preview, confirm, no-changes, scope, plain messages.
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { excelColumns, type FormDefinition } from "@/contract";
import { buildTemplateXlsx } from "@/server/xlsx/template";
import { FORM_IDS } from "@/server/forms/definitions";
import { DISTRICT, SAMITHI, USER } from "@/server/mock/fixtures";
import { apiErr, errCode, m6Setup } from "./support/m6";

const BAD_WORDS = /\b(field|null|nan|undefined|regex|column|schema|json)\b/i;

async function eyeSheet(code: string, rows: Record<string, string | number>[], t = m6Setup()) {
  const detail = await t.svc.portal.forms.detail(await t.actor(USER.stateC), FORM_IDS.templates.eye);
  const def = detail.published as FormDefinition;
  const bytes = await buildTemplateXlsx(def, { samithiCode: code });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as never);
  const ws = wb.getWorksheet("Report")!;
  const headers = excelColumns(def).map((c) => c.header);
  // Template pre-fills samithi_code for 50 rows; start clean for exact row counts.
  for (let r = 2; r <= 60; r++) for (let c = 1; c <= headers.length; c++) ws.getCell(r, c).value = null;
  rows.forEach((row, i) => headers.forEach((h, c) => ws.getCell(i + 2, c + 1).value = (row[h] ?? null) as never));
  return { bytes: new Uint8Array(await wb.xlsx.writeBuffer()), headers, t };
}

const camp = (code: string, day: number, extra: Record<string, string | number> = {}) => {
  const d = new Date(Date.UTC(2026, 7, 1 + day));
  const dd = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  return { samithi_code: code, date: dd, venue: `School hall ${day}`, volunteers: 12, volunteer_hours: 40, registered: 100, male: 40, female: 60, under_18: 5, spectacles_total: 0, cataract_found: 3, cataract_referred: 3, cataract_surgeries: 1, ...extra };
};

describe("uploads", () => {
  it("loads 38 of 42 rows, rejects 4 with plain messages, then reports no changes for the same file", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const code = (await t.repo.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const rows = Array.from({ length: 42 }, (_, i) => camp(code, i));
    rows[4] = { ...rows[4], volunteers: "" } as never; // missing
    rows[8] = { ...rows[8], registered: 999999 }; // too high
    rows[13] = { ...rows[13], date: "31/02/2026" }; // not a date
    rows[19] = { ...rows[19], date: "01/12/2026" }; // future
    const { bytes } = await eyeSheet(code, rows, t);

    const preview = await t.svc.portal.uploads.create(coord, { name: "camps.xlsx", bytes }, { sevaType: "eye", samithi: undefined });
    expect(preview.status).toBe("preview");
    expect(preview.counts).toMatchObject({ rows: 42, errors: 4, new: 38, rejected: 4 });
    expect(preview.rows.slice(0, 4).every((r) => r.issues.length > 0)).toBe(true);
    const reasons = preview.rows.flatMap((r) => r.issues.map((i) => i.reason)).sort();
    expect(reasons).toEqual(expect.arrayContaining(["missing_value", "number_too_high", "bad_date", "future_date"]));
    for (const r of preview.rows) for (const i of r.issues) {
      expect(i.message.en).not.toMatch(BAD_WORDS);
      expect(i.message.hi ?? "").not.toMatch(BAD_WORDS);
      expect(i.message.hi).toBeTruthy();
    }

    const loaded = await t.svc.portal.uploads.confirm(coord, preview.id, preview.version);
    expect(loaded.status).toBe("loaded");
    expect(loaded.counts).toMatchObject({ new: 38, rejected: 4 });
    // Rows await the district's approval.
    const pending = await t.repo.portal.approvals({ states: ["pending"], kind: "report" });
    expect(pending.length).toBeGreaterThanOrEqual(38);
    const events = await t.repo.portal.listAdminEvents({ samithiId: SAMITHI.mayurVihar, sevaType: "eye", sort: "startsAt", limit: 500, offset: 0 });
    expect(events.rows.filter((e) => e.source === "upload" && e.status === "report_submitted")).toHaveLength(38);
    // Confirming twice is refused.
    expect(await errCode(t.svc.portal.uploads.confirm(coord, preview.id, loaded.version))).toBe("CONFLICT");

    // Same file again → nothing to do.
    const again = await t.svc.portal.uploads.create(coord, { name: "camps.xlsx", bytes }, { sevaType: "eye", samithi: undefined });
    expect(again.status).toBe("no_changes");
    expect(again.sameAs?.id).toBe(preview.id);

    // History + downloads.
    const hist = await t.svc.portal.uploads.list(coord, { page: 1, pageSize: 20 } as never);
    expect(hist.data.map((b) => b.status).sort()).toEqual(["loaded", "no_changes"]);
    const errors = await t.svc.portal.uploads.errorsXlsx(coord, preview.id);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(errors.bytes) as never);
    expect(wb.getWorksheet("Report")!.getRow(1).values).toContain("Problems");
    expect((await t.svc.portal.uploads.original(coord, preview.id)).bytes.byteLength).toBe(bytes.byteLength);
  });

  it("a corrected file updates rows that are still waiting for approval", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const code = (await t.repo.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const rows = [camp(code, 0), camp(code, 1), camp(code, 2)];
    const first = await eyeSheet(code, rows, t);
    const p1 = await t.svc.portal.uploads.create(coord, { name: "a.xlsx", bytes: first.bytes }, { sevaType: "eye" });
    await t.svc.portal.uploads.confirm(coord, p1.id, p1.version);
    const fixed = [rows[0], { ...rows[1], registered: 150 }, rows[2]];
    const second = await eyeSheet(code, fixed, t);
    const p2 = await t.svc.portal.uploads.create(coord, { name: "a-fixed.xlsx", bytes: second.bytes }, { sevaType: "eye" });
    expect(p2.status).toBe("preview");
    expect(p2.counts).toMatchObject({ unchanged: 2, updated: 1, new: 0 });
    const done = await t.svc.portal.uploads.confirm(coord, p2.id, p2.version);
    expect(done.counts).toMatchObject({ updated: 1 });
  });

  it("rejects rows for samithis outside scope, unknown codes, in-file duplicates and wrong templates", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const units = await t.repo.orgUnits();
    const mine = units.find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const other = units.find((u) => u.id === SAMITHI.rohini)!.code;
    const { bytes } = await eyeSheet(mine, [camp(mine, 0), camp(other, 1), camp("NOPE", 2), camp(mine, 0)], t);
    const p = await t.svc.portal.uploads.create(coord, { name: "x.xlsx", bytes }, { sevaType: "eye" });
    const reasons = p.rows.flatMap((r) => r.issues.map((i) => i.reason));
    expect(reasons).toEqual(expect.arrayContaining(["out_of_scope", "unknown_samithi", "duplicate_row"]));
    expect(p.counts.new).toBe(1);

    const wb = new ExcelJS.Workbook();
    wb.addWorksheet("Report").addRow(["foo", "bar"]);
    const wrong = await t.svc.portal.uploads.create(coord, { name: "wrong.xlsx", bytes: new Uint8Array(await wb.xlsx.writeBuffer()) }, { sevaType: "eye" });
    expect(wrong.status).toBe("failed");
    expect(wrong.rows[0].issues[0].reason).toBe("wrong_template");
  });

  it("validates file type and size, scope for explicit samithi, and exposes options and templates", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const err = await apiErr(t.svc.portal.uploads.create(coord, { name: "notes.txt", bytes: new Uint8Array([1, 2, 3]) }, { sevaType: "eye" }));
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(await errCode(t.svc.portal.uploads.create(coord, { name: "a.csv", bytes: new TextEncoder().encode("a,b\n") }, { sevaType: "eye", samithi: SAMITHI.rohini }))).toBe("NOT_FOUND");
    const opts = await t.svc.portal.uploads.options(coord);
    expect(opts.sevaTypes.map((s) => s.sevaType)).toEqual(expect.arrayContaining(["eye", "blood"]));
    expect(opts.samithis.map((s) => s.id)).toEqual([SAMITHI.mayurVihar]);
    const tpl = await t.svc.portal.uploads.template(coord, { sevaType: "eye", samithi: SAMITHI.mayurVihar });
    expect(tpl.bytes.byteLength).toBeGreaterThan(1000);
    // Districts see the uploads of samithis below them only.
    const east = await t.actor(USER.districtB);
    const north = await t.actor(USER.districtG);
    const code = (await t.repo.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const { bytes } = await eyeSheet(code, [camp(code, 0)], t);
    const p = await t.svc.portal.uploads.create(coord, { name: "a.xlsx", bytes }, { sevaType: "eye", samithi: SAMITHI.mayurVihar });
    expect((await t.svc.portal.uploads.list(east, { page: 1, pageSize: 10 } as never)).meta.total).toBe(1);
    expect((await t.svc.portal.uploads.list(north, { page: 1, pageSize: 10 } as never)).meta.total).toBe(0);
    expect(await errCode(t.svc.portal.uploads.get(north, p.id))).toBe("NOT_FOUND");
    void DISTRICT;
  });

  it("reads CSV and sends 'own file' to the review inbox", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const code = (await t.repo.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const row = camp(code, 3);
    const header = Object.keys(row).join(",");
    const csv = new TextEncoder().encode(`﻿${header}\n${Object.values(row).join(",")}\n`);
    const p = await t.svc.portal.uploads.create(coord, { name: "camps.csv", bytes: csv }, { sevaType: "eye" });
    expect(p.rows[0]?.issues).toEqual([]);
    expect(p.counts).toMatchObject({ rows: 1, new: 1, errors: 0 });
    const res = await t.svc.portal.uploads.toInbox(coord, { name: "mine.xlsx", bytes: new Uint8Array([0x50, 0x4b, 3, 4]) }, {});
    const item = await t.repo.wa.inboxById(res.inboxItemId);
    expect(item).toMatchObject({ source: "upload", rawKind: "spreadsheet", state: "for_me" });
  });

  it("deletes a preview batch (rows, file, audit) but keeps a loaded one", async () => {
    const t = m6Setup();
    const coord = await t.actor(USER.coordA);
    const code = (await t.repo.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!.code;
    const { bytes } = await eyeSheet(code, [camp(code, 0), camp(code, 1)], t);
    const p = await t.svc.portal.uploads.create(coord, { name: "del.xlsx", bytes }, { sevaType: "eye" });
    await t.svc.portal.uploads.remove(coord, p.id);
    expect(await errCode(t.svc.portal.uploads.get(coord, p.id))).toBe("NOT_FOUND");
    expect(await t.repo.m6.docList("upload_row", { k1: p.id })).toHaveLength(0);

    const { bytes: b2 } = await eyeSheet(code, [camp(code, 3)], t);
    const q = await t.svc.portal.uploads.create(coord, { name: "keep.xlsx", bytes: b2 }, { sevaType: "eye" });
    await t.svc.portal.uploads.confirm(coord, q.id, q.version);
    expect(await errCode(t.svc.portal.uploads.remove(coord, q.id))).toBe("VALIDATION_FAILED");
  });

  it("deletes a form template (archive) unless live links or the last report form depend on it", async () => {
    const t = m6Setup();
    const admin = await t.actor(USER.stateC);
    expect(await errCode(t.svc.portal.forms.remove(admin, FORM_IDS.templates.eye))).toBe("VALIDATION_FAILED");
    const copy = await t.svc.portal.forms.duplicate(admin, FORM_IDS.templates.eye, { title: { en: "Eye copy", hi: null } });
    await t.svc.portal.forms.remove(admin, copy.template.id);
    expect((await t.svc.portal.forms.list(admin)).templates.some((r) => r.id === copy.template.id)).toBe(false);
    expect(await errCode(t.svc.portal.forms.remove(await t.actor(USER.coordA), FORM_IDS.templates.eye))).toBe("FORBIDDEN");
  });
});
