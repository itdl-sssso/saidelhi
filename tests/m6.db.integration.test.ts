// M6 on the docker MySQL (pnpm db:migrate && pnpm db:seed); skipped when unreachable. Cleans up what it creates.
import ExcelJS from "exceljs";
import { and, eq, gte, inArray, like } from "drizzle-orm";
import type { Pool } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { excelColumns, type FormDefinition } from "@/contract";
import { createDb, createPool } from "@/server/db/client";
import { M6_DOC_TABLES } from "@/server/db/schema/m6";
import { approval, auditLog, event, eventTimeline, formTemplate, formVersion, notificationLog, submission, submissionAnswerKpi } from "@/server/db/tables";
import { FORM_IDS } from "@/server/forms/definitions";
import { EVENT, SAMITHI, USER } from "@/server/mock/fixtures";
import { DbRepo } from "@/server/repo/db";
import { createServices } from "@/server/services/create";
import { buildTemplateXlsx } from "@/server/xlsx/template";
import { FakeWhatsApp, MemoryStorage } from "./support/links";
import { numField } from "./support/m6";

const url = process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi";

async function probe(): Promise<Pool | null> {
  const pool = createPool(url);
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS n FROM app_user");
    const [m6] = await pool.query("SELECT COUNT(*) AS n FROM upload_batch");
    if (Array.isArray(rows) && Number((rows[0] as { n: number }).n) > 0 && Array.isArray(m6)) return pool;
  } catch {
    // unreachable, or migration 0006/0007 or the seed not applied
  }
  await pool.end().catch(() => {});
  return null;
}

const pool = await probe();

describe.skipIf(!pool)("M6 on MySQL (integration)", () => {
  const started = new Date(Date.now() - 2000);
  const db = pool ? createDb(pool) : null;
  const repo = db ? new DbRepo(db) : null;
  const svc = repo ? createServices(repo, { now: () => new Date(), mediaBase: "/media", whatsapp: new FakeWhatsApp(), storage: new MemoryStorage() }) : null;
  const rc = { requestId: "it-m6", ipHash: null };
  const createdTemplates: string[] = [];
  const createdBatches: string[] = [];

  afterAll(async () => {
    if (!db || !repo) return;
    // Uploaded events (source upload, created during this run) and everything hanging off them.
    const evs = await db.select({ id: event.id }).from(event).where(and(eq(event.source, "upload"), gte(event.updatedAt, started)));
    const ids = evs.map((e) => e.id);
    if (ids.length) {
      await db.delete(submissionAnswerKpi).where(inArray(submissionAnswerKpi.eventId, ids));
      await db.delete(submission).where(inArray(submission.eventId, ids));
      await db.delete(approval).where(inArray(approval.eventId, ids));
      await db.delete(eventTimeline).where(inArray(eventTimeline.eventId, ids));
      await db.delete(notificationLog).where(inArray(notificationLog.eventId, ids));
      await db.delete(event).where(inArray(event.id, ids));
    }
    for (const id of createdBatches) {
      const rows = await repo.m6.docList("upload_row", { k1: id });
      for (const r of rows) await repo.m6.docDelete("upload_row", r.id);
      await repo.m6.docDelete("upload_batch", id);
    }
    for (const id of createdTemplates) {
      await db.delete(formVersion).where(eq(formVersion.templateId, id));
      await db.delete(formTemplate).where(eq(formTemplate.id, id));
    }
    await repo.m6.docDelete("kpi_definition", "volunteers");
    await db.delete(M6_DOC_TABLES.ui_string).where(like(M6_DOC_TABLES.ui_string.id, "hi:it.%"));
    await db.delete(auditLog).where(and(gte(auditLog.at, started), eq(auditLog.requestId, "it-m6")));
    await pool?.end();
  });

  it("builds a form, gates publish on Hindi, publishes v1 and keeps docs consistent", async () => {
    const s = svc!;
    const state = (await s.auth.actorFor(USER.stateC, rc))!;
    const d = await s.portal.forms.create(state, { title: { en: "Integration camp", hi: null }, sevaType: "medical" });
    createdTemplates.push(d.template.id);
    expect(d.draft?.version).toBe(1);
    // A question without Hindi → publish refused with `fields` keyed by that question.
    const def = structuredClone(d.draft!) as FormDefinition;
    def.sections[1].fields.push(numField("patients_seen", "Patients seen", null));
    const first = await s.portal.forms.patchDraft(state, d.template.id, { definition: def, version: d.version });
    await expect(s.portal.forms.publish(state, d.template.id, first.version!)).rejects.toMatchObject({ code: "VALIDATION_FAILED", fields: { patients_seen: expect.any(String) } });
    def.sections[1].fields[0].label.hi = "देखे गए मरीज़";
    const saved = await s.portal.forms.patchDraft(state, d.template.id, { definition: def, version: first.version });
    expect(saved.version).toBe(3);
    await expect(s.portal.forms.patchDraft(state, d.template.id, { definition: def, version: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
    const pub = await s.portal.forms.publish(state, d.template.id, saved.version!);
    expect(pub.template.current?.version).toBe(1);
    expect(pub.draft).toBeNull();
    const xlsx = await s.portal.forms.templateXlsx(state, d.template.id, {});
    expect(xlsx.bytes.byteLength).toBeGreaterThan(500);
  });

  it("settings, KPI override and UI strings round-trip through the document tables", async () => {
    const s = svc!;
    const state = (await s.auth.actorFor(USER.stateC, rc))!;
    const k = (await s.portal.settings.kpis.list(state)).find((x) => x.key === "volunteers")!;
    const p = await s.portal.settings.kpis.patch(state, "volunteers", { note: { en: "Test note", hi: null }, version: k.version });
    expect(p.note?.en).toBe("Test note");
    expect((await s.portal.settings.kpis.list(state)).find((x) => x.key === "volunteers")?.version).toBe(k.version + 1);
    const strings = await s.portal.settings.strings.list(state, { page: 1, pageSize: 3 } as never);
    expect(strings.meta.total).toBeGreaterThan(100);
  });

  it("uploads: preview, confirm into events awaiting approval, then no changes", async () => {
    const s = svc!;
    const coord = (await s.auth.actorFor(USER.coordA, rc))!;
    const detail = await s.portal.forms.detail((await s.auth.actorFor(USER.stateC, rc))!, FORM_IDS.templates.eye);
    const def = detail.published as FormDefinition;
    const mayur = (await repo!.orgUnits()).find((u) => u.id === SAMITHI.mayurVihar)!;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await buildTemplateXlsx(def, { samithiCode: mayur.code })) as never);
    const ws = wb.getWorksheet("Report")!;
    const headers = excelColumns(def).map((c) => c.header);
    for (let r = 2; r <= 60; r++) for (let c = 1; c <= headers.length; c++) ws.getCell(r, c).value = null;
    // Dates in 2020 are far from the seeded events, so nothing collides with them.
    const base = { venue: "Integration hall", volunteers: 9, volunteer_hours: 30, registered: 50, male: 20, female: 30, under_18: 2, spectacles_total: 0, cataract_found: 1, cataract_referred: 1, cataract_surgeries: 0 };
    const rows = [
      { ...base, date: "11/03/2020" },
      { ...base, date: "12/03/2020" },
      { ...base, date: "13/03/2020", volunteers: "" },
    ];
    rows.forEach((row, i) => {
      const rec: Record<string, unknown> = { samithi_code: mayur.code, ...row };
      headers.forEach((h, c) => (ws.getCell(i + 2, c + 1).value = (rec[h] ?? null) as never));
    });
    const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
    const p = await s.portal.uploads.create(coord, { name: "it.xlsx", bytes }, { sevaType: "eye" });
    createdBatches.push(p.id);
    expect(p.counts).toMatchObject({ rows: 3, errors: 1, new: 2, rejected: 1 });
    const done = await s.portal.uploads.confirm(coord, p.id, p.version);
    expect(done.counts).toMatchObject({ new: 2, rejected: 1 });
    const pending = await repo!.portal.approvals({ states: ["pending"], kind: "report" });
    expect(pending.filter((a) => a.requestChannel !== null).length).toBeGreaterThanOrEqual(2);
    const again = await s.portal.uploads.create(coord, { name: "it.xlsx", bytes }, { sevaType: "eye" });
    createdBatches.push(again.id);
    expect(again.status).toBe("no_changes");
    void EVENT;
  });

  it("content: native articles, legacy copy-on-write, thoughts and redirects on MySQL; migration preview", async () => {
    const s = svc!;
    const ed = (await s.auth.actorFor(USER.contentD, rc))!;
    const state = (await s.auth.actorFor(USER.stateC, rc))!;
    const cleanup: (() => Promise<unknown>)[] = [];
    try {
      const a = await s.portal.content.create(ed, { kind: "article", category: "news", title: { en: "Integration story", hi: null }, bodyHtml: { en: "<p>Hi</p><div data-event-results=\"abc\"></div>", hi: null } } as never);
      cleanup.push(() => repo!.m6.docDelete("article", a.id));
      if (a.kind !== "article") throw new Error("article");
      expect(a.bodyHtml.en).toContain('data-event-results="abc"');
      const pub = await s.portal.content.patch(ed, a.id, { status: "published", version: a.version });
      expect(pub).toMatchObject({ status: "published", version: 2 });
      expect((await s.articles.bySlug(a.slug))?.title.en).toBe("Integration story");
      expect((await s.articles.list({ c: "all", page: 1, pageSize: 3 } as never)).data[0].slug).toBe(a.slug);
      const tab = await s.portal.content.list(ed, { page: 1, pageSize: 5, tab: "news", q: "Integration story" } as never);
      expect(tab.data.map((r) => r.id)).toContain(a.id);
      expect(tab.meta.counts.all).toBeGreaterThan(0);

      // Legacy post: first PATCH copies it, then the public site shows the edit once.
      const legacy = (await s.portal.content.list(ed, { page: 1, pageSize: 5, tab: "activities" } as never)).data.find((r) => r.legacy && r.id.startsWith("legacy-"));
      if (legacy) {
        const g = await s.portal.content.get(ed, legacy.id);
        if (g.kind !== "article") throw new Error("article");
        const p = await s.portal.content.patch(ed, legacy.id, { title: { en: "IT edited legacy", hi: null }, version: 0 });
        cleanup.push(() => repo!.m6.docDelete("article", p.id));
        expect(p).toMatchObject({ legacyId: g.legacyId, slug: g.slug });
        const all = await s.articles.list({ c: "activities", page: 1, pageSize: 100 } as never);
        expect(all.data.filter((x) => x.slug === g.slug).map((x) => x.title.en)).toEqual(["IT edited legacy"]);
        expect((await s.portal.content.get(ed, legacy.id)).id).toBe(p.id);
      }

      const th = await s.portal.content.create(ed, { kind: "item", type: "thought_for_day", date: "2099-01-05", body: { en: "IT thought", hi: null } } as never);
      cleanup.push(() => repo!.m6.contentItemDelete(th.id));
      const imp = await s.portal.content.importThoughts(ed, { name: "t.csv", bytes: new TextEncoder().encode("date,text_en,text_hi,source_en,source_hi\n2099-01-05,IT updated,,,\n2099-01-06,IT new,,,\n") });
      expect(imp).toMatchObject({ created: 1, updated: 1, errors: [] });
      const row = (await repo!.m6.contentItemsAll("thought_for_day")).find((c) => c.date === "2099-01-06");
      if (row) cleanup.push(() => repo!.m6.contentItemDelete(row.id));
      const days = await s.portal.content.thoughts(ed, { from: "2099-01-05", to: "2099-01-07" });
      expect(days.map((d) => d.item?.body?.en ?? null)).toEqual(["IT updated", "IT new", null]);
      expect(days[2].shown?.repeated).toBe(true);

      const r = await s.portal.migration.redirects.upsert(state, { from: "/it-old-page/", to: "/news", permanent: false });
      cleanup.push(() => repo!.m6.redirectDelete("/it-old-page"));
      expect(r).toMatchObject({ from: "/it-old-page", source: "manual", permanent: false });
      expect((await s.portal.migration.redirects.list(state, { page: 1, pageSize: 50, q: "it-old" } as never)).data).toHaveLength(1);
      await s.portal.migration.redirects.upsert(state, { from: "/it-old-page", to: "/events" });
      expect((await s.redirects.resolve("/it-old-page"))?.to).toBeDefined();
      await s.portal.migration.redirects.remove(state, "/it-old-page");

      // Preview only: never import on the shared dev DB.
      const run = await s.portal.migration.create(state, "legacy_db");
      cleanup.push(() => repo!.m6.docDelete("migration_run", run.id));
      expect(run.status).toBe("mapping");
      expect(run.types.some((t) => t.sourceType.startsWith("post:"))).toBe(true);
      expect(run.counts.items).toBeGreaterThan(0);
      expect((await s.portal.migration.reportCsv(state, run.id)).startsWith("ref,title,problem,fix_path")).toBe(true);
    } finally {
      for (const fn of cleanup.reverse()) await fn().catch(() => {});
    }
  });
});
