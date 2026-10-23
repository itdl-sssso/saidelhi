// TEMP M6 until backend merge — reports fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const now = () => new Date().toISOString();
const ncr = { id: "ncr", slug: "ncr", kind: "state", name: { en: "Delhi NCR", hi: "दिल्ली एनसीआर" } };
const monthly = [
  { id: "r1", month: "2026-09", scope: ncr, status: "ready", generatedAt: now(), pages: 6, sizeBytes: 182000, url: "/api/v1/admin/reports/monthly/r1.pdf" },
  { id: "r2", month: "2026-08", scope: ncr, status: "ready", generatedAt: now(), pages: 5, sizeBytes: 160000, url: "/api/v1/admin/reports/monthly/r2.pdf" },
];
const schedules = [{ id: "s1", kind: "monthly_state", scope: ncr, dayOfMonth: 7, recipients: [{ userId: "u1", name: "State Admin", role: "state_admin", hasEmail: true }, { userId: "u2", name: "Asha Verma", role: "district_coord", hasEmail: false }], lastSentAt: now(), active: true, version: 1 }];
const k = (key: string, en: string, kinds: string[], d = true) => ({ key, label: { en, hi: en }, kinds, default: d });
const exportFields = [k("date", "Date", ["event_reports", "events"]), k("samithi", "Samithi", ["event_reports", "events"]), k("sevaType", "Seva type", ["event_reports", "events", "kpi_totals"]), k("district", "District", ["event_reports", "events", "kpi_totals"]), k("people_served", "People served", ["event_reports", "kpi_totals"]), k("status", "Status", ["events"], false)];
const recent = [{ id: "x1", at: now(), by: "State Admin", kind: "event_reports", scope: { id: "ncr", slug: "ncr", name: ncr.name }, from: "2026-09-01", to: "2026-09-30", rows: 128, reason: "For district meeting" }];
registerFixtures(({ method, path, body }) => {
  if (path === "/admin/reports" && method === "GET") return { data: { monthly, schedules, exportFields, recentExports: recent, can: { manageSchedules: true } } };
  if (path === "/admin/reports/monthly" && method === "POST") {
    const b = body as { month: string };
    monthly.unshift({ ...monthly[0], id: `r${monthly.length + 1}`, month: b.month, status: "generating" });
    return { status: 202, data: monthly[0] };
  }
  if (path.startsWith("/admin/reports/schedules/") && method === "PATCH") {
    const b = body as { active?: boolean; recipientIds?: string[]; dayOfMonth?: number };
    if (b.active !== undefined) schedules[0].active = b.active;
    if (b.recipientIds) schedules[0].recipients = schedules[0].recipients.filter((r) => b.recipientIds!.includes(r.userId));
    schedules[0].version += 1;
    return { data: schedules[0] };
  }
  if (path === "/admin/exports" && method === "POST") {
    const b = body as { reason: string; fields: string[]; kind: string };
    if (!b.reason || b.reason.length < 5) return { status: 422, data: { code: "VALIDATION", message: "Give a reason.", fields: { reason: "Give a reason of at least 5 characters." } } };
    recent.unshift({ id: `x${recent.length + 1}`, at: now(), by: "State Admin", kind: b.kind, scope: recent[0].scope, from: "2026-10-01", to: "2026-10-23", rows: 3, reason: b.reason });
    return { raw: { text: `﻿${b.fields.join(",")}\n2026-10-01,Rohini,eye\n`, type: "text/csv; charset=utf-8" } };
  }
  if (path.startsWith("/admin/reports/monthly/") && path.endsWith(".pdf")) return { raw: { text: "%PDF-1.4 dev", type: "application/pdf" } };
});
