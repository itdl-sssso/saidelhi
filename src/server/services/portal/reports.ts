// Reports + exports (spec 44): allow-listed CSV exports (never personal columns), monthly
// PDF report from approved events only, report schedules and the monthly-report cron.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type {
  ExportField,
  ExportKind,
  ExportLogRow,
  ExportRequest,
  MonthlyReport,
  MonthlyReportCreate,
  ReportRecipient,
  ReportSchedule,
  ReportSchedulePatch,
  ReportsPayload,
  ScopeRef,
} from "@/contract";
import { auditRec, type SystemActor } from "../../audit";
import { type Actor, assertCan, assertInScope, can, inScope } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { addDays, istDate, istDayStart, istMonth, toIso } from "../../domain/time";
import { KPI_DEFS } from "../../domain/kpi";
import { ApiError } from "../../http/errors";
import type { EventRec, KpiFactRec } from "../../repo/types";
import { decryptField } from "../../security/crypto";
import type { OrgIndex } from "../org-index";
import { holders, loadOrg, type PortalCtx, portalUrl } from "./shared";

export interface ReportsService {
  overview(actor: Actor): Promise<ReportsPayload>;
  exportCsv(actor: Actor, body: ExportRequest): Promise<{ csv: string; filename: string; rows: number }>;
  generateMonthly(actor: Actor, body: MonthlyReportCreate): Promise<MonthlyReport>;
  monthlyPdf(actor: Actor, id: string): Promise<Uint8Array>;
  patchSchedule(actor: Actor, id: string, body: ReportSchedulePatch): Promise<ReportSchedule>;
  /** Cron `monthly-report`: previous month's PDF per active schedule once its day has come. */
  runMonthly(by: SystemActor): Promise<{ ids: string[]; notified: number }>;
}

interface ScheduleData {
  kind: ReportSchedule["kind"];
  scopeId: string;
  dayOfMonth: number;
  recipientIds: string[];
  lastSentAt: string | null;
  active: boolean;
}

interface MonthlyData {
  month: string;
  scopeId: string;
  status: MonthlyReport["status"];
  generatedAt: string | null;
  pages: number | null;
  sizeBytes: number | null;
  path: string | null;
}

const T = (en: string, hi: string) => ({ en, hi });
const EVENT_COLS = [
  { key: "date", label: T("Date", "तारीख"), kinds: ["event_reports", "events"] as ExportKind[], default: true },
  { key: "title", label: T("Event", "कार्यक्रम"), kinds: ["event_reports", "events"] as ExportKind[], default: true },
  { key: "seva_type", label: T("Seva type", "सेवा का प्रकार"), kinds: ["event_reports", "events", "kpi_totals"] as ExportKind[], default: true },
  { key: "district", label: T("District", "ज़िला"), kinds: ["event_reports", "events", "kpi_totals"] as ExportKind[], default: true },
  { key: "samithi", label: T("Samithi", "समिति"), kinds: ["event_reports", "events"] as ExportKind[], default: true },
  { key: "status", label: T("Status", "स्थिति"), kinds: ["event_reports", "events"] as ExportKind[], default: false },
  { key: "venue", label: T("Venue", "स्थान"), kinds: ["events"] as ExportKind[], default: false },
  { key: "source", label: T("Reported via", "रिपोर्ट का माध्यम"), kinds: ["event_reports", "events"] as ExportKind[], default: false },
  { key: "events", label: T("Events", "कार्यक्रम"), kinds: ["kpi_totals"] as ExportKind[], default: true },
];
/** Allow-list: event/location columns plus one column per KPI total. Nothing personal can ever be listed. */
export const EXPORT_FIELDS: ExportField[] = [
  ...EVENT_COLS,
  ...KPI_DEFS.map((k) => ({ key: k.key, label: k.label, kinds: ["event_reports", "kpi_totals"] as ExportKind[], default: k.served || k.key === "volunteer_hours" })),
];
const FIELD_BY_KEY = new Map(EXPORT_FIELDS.map((f) => [f.key, f]));

/** Spreadsheet formula guard: a text cell starting with = + - @ would run in Excel. */
const cell = (v: string | number | null): string => {
  if (v === null) return "";
  const s = String(v);
  const safe = typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const monthWindow = (month: string) => {
  const from = istDayStart(`${month}-01`);
  const next = new Date(from.getTime() + 32 * 86_400_000);
  return { from, to: istDayStart(`${istMonth(next)}-01`) };
};

const prevMonth = (d: Date) => istMonth(new Date(istDayStart(`${istMonth(d)}-01`).getTime() - 86_400_000));

export function createReportsService(ctx: PortalCtx): ReportsService {
  const { repo, deps } = ctx;

  const scopeRef = (org: OrgIndex, id: string): ScopeRef => ({ ...org.ref(id), kind: org.get(id)?.kind ?? "ncr" });

  /** Samithis under a scope unit (NCR = every samithi). */
  async function samithisUnder(org: OrgIndex, scopeId: string): Promise<string[] | undefined> {
    const u = org.get(scopeId);
    if (!u) throw new ApiError("NOT_FOUND");
    if (u.kind === "ncr") return undefined;
    return (await repo.portal.descendantIds(scopeId)).filter((id) => org.get(id)?.kind === "samithi");
  }

  async function ncrId(org: OrgIndex): Promise<string> {
    const district = org.districts()[0];
    return district?.parentId ?? "";
  }

  async function approvedEvents(org: OrgIndex, scopeId: string, from: Date, to: Date, statuses: readonly EventRec["status"][]) {
    const { rows } = await repo.portal.listAdminEvents({ samithiIds: await samithisUnder(org, scopeId), statuses, from, to, sort: "startsAt", limit: 20_000, offset: 0 });
    return rows;
  }

  /** Total (dim '') per event and KPI key. */
  async function totals(events: readonly EventRec[]) {
    const out = new Map<string, Map<string, number>>();
    const facts: KpiFactRec[] = events.length ? await repo.portal.factsForEvents(events.map((e) => e.id)) : [];
    for (const f of facts) {
      if (f.dim !== "" || f.value === null) continue;
      const m = out.get(f.eventId) ?? new Map<string, number>();
      m.set(f.kpiKey, (m.get(f.kpiKey) ?? 0) + f.value);
      out.set(f.eventId, m);
    }
    return out;
  }

  const sevaLabel = async () => new Map((await repo.sevaTypes()).map((s) => [s.code, s.labelEn]));

  // ---- CSV -------------------------------------------------------------------

  async function exportRows(org: OrgIndex, body: ExportRequest): Promise<{ header: string[]; rows: (string | number | null)[][] }> {
    const from = istDayStart(body.from);
    const to = istDayStart(addDays(body.to, 1));
    const seva = await sevaLabel();
    const wanted = body.sevaTypes ?? [];
    const events = (await approvedEvents(org, body.scopeId, from, to, body.kind === "events" ? ["planned", "postponed", "awaiting_report", "report_submitted", "approved", "awaiting_approval", "escalated", "cancelled"] : ["approved"])).filter(
      (e) => wanted.length === 0 || wanted.includes(e.sevaType),
    );
    const t = body.kind === "events" ? new Map<string, Map<string, number>>() : await totals(events);
    const header = body.fields.map((k) => FIELD_BY_KEY.get(k)!.label.en);
    const district = (e: EventRec) => org.ref(e.districtId).name.en;
    if (body.kind === "kpi_totals") {
      const groups = new Map<string, { e: EventRec; n: number; sums: Map<string, number> }>();
      for (const e of events) {
        const k = `${e.districtId}:${e.sevaType}`;
        const g = groups.get(k) ?? { e, n: 0, sums: new Map<string, number>() };
        g.n++;
        for (const [key, v] of t.get(e.id) ?? []) g.sums.set(key, (g.sums.get(key) ?? 0) + v);
        groups.set(k, g);
      }
      const rows = [...groups.values()]
        .sort((a, b) => district(a.e).localeCompare(district(b.e)) || a.e.sevaType.localeCompare(b.e.sevaType))
        .map((g) =>
          body.fields.map((k) => (k === "district" ? district(g.e) : k === "seva_type" ? (seva.get(g.e.sevaType) ?? g.e.sevaType) : k === "events" ? g.n : (g.sums.get(k) ?? null))),
        );
      return { header, rows };
    }
    const value = (e: EventRec, k: string): string | number | null => {
      switch (k) {
        case "date":
          return istDate(e.startsAt);
        case "title":
          return e.titleEn;
        case "seva_type":
          return seva.get(e.sevaType) ?? e.sevaType;
        case "district":
          return district(e);
        case "samithi":
          return org.ref(e.samithiId).name.en;
        case "status":
          return e.status;
        case "venue":
          return e.venueName;
        case "source":
          return e.source;
        default:
          return t.get(e.id)?.get(k) ?? null;
      }
    };
    return { header, rows: events.map((e) => body.fields.map((k) => value(e, k))) };
  }

  // ---- PDF -------------------------------------------------------------------

  async function monthlyPdfBytes(org: OrgIndex, month: string, scopeId: string): Promise<{ bytes: Uint8Array; pages: number }> {
    const { from, to } = monthWindow(month);
    const events = await approvedEvents(org, scopeId, from, to, ["approved"]);
    const t = await totals(events);
    const seva = await sevaLabel();
    const sum = (list: readonly EventRec[], keys: readonly string[]) => list.reduce((n, e) => n + keys.reduce((m, k) => m + (t.get(e.id)?.get(k) ?? 0), 0), 0);
    const served = KPI_DEFS.filter((k) => k.served).map((k) => k.key);

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.15, 0.12, 0.1);
    const muted = rgb(0.45, 0.4, 0.36);
    const W = 595;
    const H = 842;
    const scope = org.ref(scopeId).name.en;
    const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(from);

    const text = (p: PDFPage, s: string, x: number, y: number, size = 11, f: PDFFont = font, color = ink) => p.drawText(s.replace(/[^\x20-\x7E]/g, "?"), { x, y, size, font: f, color });

    const cover = doc.addPage([W, H]);
    text(cover, "Sri Sathya Sai Seva Organisation", 56, 740, 13, font, muted);
    text(cover, "Delhi NCR", 56, 722, 13, font, muted);
    text(cover, `Seva report, ${monthName}`, 56, 640, 28, bold);
    text(cover, scope, 56, 604, 16);
    text(cover, `${events.length} approved ${events.length === 1 ? "activity" : "activities"}. Figures come from approved reports only.`, 56, 560, 11, font, muted);
    text(cover, `Generated ${istDate(deps.now())}`, 56, 540, 10, font, muted);

    const body = doc.addPage([W, H]);
    text(body, "Key figures", 56, 780, 18, bold);
    const tiles: [string, string][] = [
      ["Activities", String(events.length)],
      ["People served", String(sum(events, served))],
      ["Volunteer hours", String(sum(events, ["volunteer_hours"]))],
      ["Units of blood", String(sum(events, ["blood.units"]))],
    ];
    tiles.forEach(([label, val], i) => {
      const x = 56 + (i % 2) * 250;
      const y = 700 - Math.floor(i / 2) * 90;
      body.drawRectangle({ x, y: y - 10, width: 230, height: 74, borderColor: rgb(0.85, 0.8, 0.74), borderWidth: 1 });
      text(body, val, x + 14, y + 26, 24, bold);
      text(body, label, x + 14, y + 6, 10, font, muted);
    });

    let y = 500;
    const table = (title: string, head: string[], rows: string[][]) => {
      text(body, title, 56, y, 14, bold);
      y -= 22;
      const cols = [56, 270, 380, 470];
      head.forEach((h, i) => text(body, h, cols[i], y, 9, bold, muted));
      y -= 16;
      for (const r of rows) {
        if (y < 60) break;
        r.forEach((c, i) => text(body, c.slice(0, 34), cols[i], y, 10));
        y -= 15;
      }
      y -= 18;
    };
    const byDistrict = new Map<string, EventRec[]>();
    for (const e of events) byDistrict.set(e.districtId, [...(byDistrict.get(e.districtId) ?? []), e]);
    table(
      "By district",
      ["District", "Activities", "People served", "Volunteer hours"],
      [...byDistrict.entries()].map(([id, list]) => [org.ref(id).name.en, String(list.length), String(sum(list, served)), String(sum(list, ["volunteer_hours"]))]).sort((a, b) => a[0].localeCompare(b[0])),
    );
    const bySeva = new Map<string, EventRec[]>();
    for (const e of events) bySeva.set(e.sevaType, [...(bySeva.get(e.sevaType) ?? []), e]);
    table(
      "By seva type",
      ["Seva type", "Activities", "People served", "Volunteer hours"],
      [...bySeva.entries()].map(([code, list]) => [seva.get(code as EventRec["sevaType"]) ?? code, String(list.length), String(sum(list, served)), String(sum(list, ["volunteer_hours"]))]),
    );
    return { bytes: await doc.save(), pages: doc.getPageCount() };
  }

  async function generate(by: Actor | SystemActor, org: OrgIndex, month: string, scopeId: string): Promise<MonthlyReport> {
    if (!deps.storage) throw new ApiError("PROVIDER_UNAVAILABLE");
    const id = `mr_${month}_${scopeId}`;
    const prior = await repo.m6.docGet<MonthlyData>("monthly_report", id);
    const { bytes, pages } = await monthlyPdfBytes(org, month, scopeId);
    const path = `reports/${month}-${scopeId}-${Date.now().toString(36)}.pdf`;
    await deps.storage.put(path, bytes);
    if (prior?.data.path) await deps.storage.delete?.(prior.data.path).catch(() => false);
    const data: MonthlyData = { month, scopeId, status: "ready", generatedAt: toIso(deps.now()), pages, sizeBytes: bytes.byteLength, path };
    const audit = [auditRec(by, { action: "report.monthly", entity: "monthly_report", entityId: id, scopeId, data: { month, pages } })];
    await repo.m6.docUpsert("monthly_report", { id, k1: month, k2: scopeId, data }, audit);
    return monthlyDto({ id, data }, org);
  }

  const monthlyDto = (r: { id: string; data: MonthlyData }, org: OrgIndex): MonthlyReport => ({
    id: r.id,
    month: r.data.month,
    scope: scopeRef(org, r.data.scopeId),
    status: r.data.status,
    generatedAt: r.data.generatedAt,
    pages: r.data.pages,
    sizeBytes: r.data.sizeBytes,
    url: `/api/v1/admin/reports/monthly/${r.id}.pdf`,
  });

  // ---- schedules ---------------------------------------------------------------

  async function ensureSchedule(org: OrgIndex) {
    const id = "sched_monthly_state";
    if (await repo.m6.docGet("report_schedule", id)) return;
    const admins = await holders(ctx, "state_admin", null);
    const data: ScheduleData = { kind: "monthly_state", scopeId: await ncrId(org), dayOfMonth: 7, recipientIds: admins.map((p) => p.user.id), lastSentAt: null, active: true };
    await repo.m6.docInsert("report_schedule", { id, data });
  }

  async function scheduleDto(rec: { id: string; version: number; data: ScheduleData }, org: OrgIndex): Promise<ReportSchedule> {
    const users = await repo.portal.usersByIds(rec.data.recipientIds);
    const people = await repo.portal.people();
    const recipients: ReportRecipient[] = users.flatMap((u) => {
      const role = people.find((p) => p.user.id === u.id)?.role?.role;
      return role ? [{ userId: u.id, name: u.name, role, hasEmail: !!u.email }] : [];
    });
    return { id: rec.id, kind: rec.data.kind, scope: scopeRef(org, rec.data.scopeId), dayOfMonth: rec.data.dayOfMonth, recipients, lastSentAt: rec.data.lastSentAt, active: rec.data.active, version: rec.version };
  }

  return {
    async overview(actor) {
      assertCan(actor, "reports.export");
      const org = await loadOrg(repo);
      await ensureSchedule(org);
      const monthly = (await repo.m6.docList<MonthlyData>("monthly_report")).filter((r) => inScope(actor, r.data.scopeId) || (actor.all && !!org.get(r.data.scopeId)));
      const schedules = (await repo.m6.docList<ScheduleData>("report_schedule", { order: "asc" })).filter((r) => actor.all || inScope(actor, r.data.scopeId));
      const logs = (await repo.m6.docList<Omit<ExportLogRow, "id">>("export_log", { limit: 20 })).filter((l) => actor.all || inScope(actor, l.data.scope.id));
      return {
        monthly: monthly.sort((a, b) => b.data.month.localeCompare(a.data.month)).map((r) => monthlyDto(r, org)),
        schedules: await Promise.all(schedules.map((s) => scheduleDto(s, org))),
        exportFields: EXPORT_FIELDS,
        recentExports: logs.map((l) => ({ ...l.data, id: l.id })),
        can: { manageSchedules: actor.role === "state_admin" },
      };
    },

    async exportCsv(actor, body) {
      assertCan(actor, "reports.export");
      const org = await loadOrg(repo);
      assertInScope(actor, body.scopeId);
      const reason = body.reason.trim();
      if (reason.length < 5) throw new ApiError("VALIDATION_FAILED", { fields: { reason: "Say why you need this export." } });
      const bad = body.fields.filter((k) => !FIELD_BY_KEY.get(k)?.kinds.includes(body.kind));
      if (bad.length) throw new ApiError("VALIDATION_FAILED", { fields: { fields: `Not available for this export: ${bad.slice(0, 5).join(", ")}` } });
      if (body.to < body.from) throw new ApiError("VALIDATION_FAILED", { fields: { to: "End date is before the start date." } });
      const { header, rows } = await exportRows(org, body);
      const id = newId();
      const log: Omit<ExportLogRow, "id"> = { at: toIso(deps.now()), by: actor.name, kind: body.kind, scope: org.ref(body.scopeId), from: body.from, to: body.to, rows: rows.length, reason };
      await repo.m6.docInsert("export_log", { id, data: log }, [
        auditRec(actor, { action: "export.create", entity: "export", entityId: id, scopeId: body.scopeId, data: { kind: body.kind, rows: rows.length, fields: body.fields, reason } }),
      ]);
      const csv = `﻿${[header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
      return { csv, filename: `${body.kind}-${body.from}-${body.to}.csv`, rows: rows.length };
    },

    async generateMonthly(actor, body) {
      assertCan(actor, "reports.export");
      if (actor.role !== "state_admin") throw new ApiError("FORBIDDEN");
      const org = await loadOrg(repo);
      const scopeId = body.scopeId ?? (await ncrId(org));
      if (!org.get(scopeId)) throw new ApiError("NOT_FOUND");
      return generate(actor, org, body.month, scopeId);
    },

    async monthlyPdf(actor, id) {
      assertCan(actor, "reports.export");
      const rec = await repo.m6.docGet<MonthlyData>("monthly_report", id);
      if (!rec) throw new ApiError("NOT_FOUND");
      assertInScope(actor, rec.data.scopeId);
      const bytes = rec.data.path ? await deps.storage?.get(rec.data.path) : null;
      if (!bytes) throw new ApiError("NOT_FOUND");
      await repo.portal.insertAudit(auditRec(actor, { action: "report.download", entity: "monthly_report", entityId: id, scopeId: rec.data.scopeId }));
      return bytes;
    },

    async patchSchedule(actor, id, body) {
      assertCan(actor, "reports.export");
      if (actor.role !== "state_admin") throw new ApiError("FORBIDDEN");
      const org = await loadOrg(repo);
      const rec = await repo.m6.docGet<ScheduleData>("report_schedule", id);
      if (!rec) throw new ApiError("NOT_FOUND");
      if (rec.version !== body.version) throw new ApiError("CONFLICT");
      const d: ScheduleData = { ...rec.data };
      if (body.recipientIds) {
        const users = await repo.portal.usersByIds(body.recipientIds);
        if (users.length !== new Set(body.recipientIds).size) throw new ApiError("VALIDATION_FAILED", { fields: { recipientIds: "Unknown person." } });
        d.recipientIds = [...new Set(body.recipientIds)];
      }
      if (body.dayOfMonth !== undefined) d.dayOfMonth = body.dayOfMonth;
      if (body.active !== undefined) d.active = body.active;
      const res = await repo.m6.docUpdate("report_schedule", { id, data: d }, body.version, [
        auditRec(actor, { action: "report.schedule", entity: "report_schedule", entityId: id, data: { dayOfMonth: d.dayOfMonth, active: d.active, recipients: d.recipientIds.length } }),
      ]);
      if (!res.ok) throw new ApiError("CONFLICT");
      return scheduleDto({ id, version: res.version, data: d }, org);
    },

    async runMonthly(by) {
      const now = deps.now();
      const org = await loadOrg(repo);
      await ensureSchedule(org);
      const month = prevMonth(now);
      const day = Number(istDate(now).slice(8, 10));
      const out = { ids: [] as string[], notified: 0 };
      for (const s of await repo.m6.docList<ScheduleData>("report_schedule", { order: "asc" })) {
        if (!s.data.active || day < s.data.dayOfMonth) continue;
        if (!(await repo.portal.claimNotification(`monthly-report:${s.id}:${month}`, "monthly_report", null, now))) continue;
        const report = await generate(by, org, month, s.data.scopeId);
        out.ids.push(report.id);
        const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(istDayStart(`${month}-01`));
        const link = portalUrl(ctx, "/reports");
        const people = (await repo.portal.people()).filter((p) => s.data.recipientIds.includes(p.user.id) && p.user.status !== "deactivated");
        for (const p of people) {
          try {
            if (p.user.email) {
              await deps.email.send({ to: p.user.email, subject: `Seva report, ${monthName}`, text: `The ${monthName} seva report for ${org.ref(s.data.scopeId).name.en} is ready: ${link}` });
              out.notified++;
            } else {
              const phone = decryptField(deps.secret, p.user.phoneEnc);
              if (phone) {
                await deps.whatsapp.sendTemplate(phone, "monthly_report_ready", p.user.locale, [monthName, link]);
                out.notified++;
              }
            }
          } catch (err) {
            console.error("[jobs] monthly report delivery failed", err instanceof Error ? err.message : err);
          }
        }
        await repo.m6.docUpdate("report_schedule", { id: s.id, data: { ...s.data, lastSentAt: toIso(now) } }, s.version);
      }
      return out;
    },
  };
}
