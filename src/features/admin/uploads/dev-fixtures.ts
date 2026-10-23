/* eslint-disable @typescript-eslint/no-explicit-any */
// TEMP M6 until backend merge — uploads fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const counts = (o: Partial<Record<string, number>>) => ({ rows: 0, ok: 0, warnings: 0, errors: 0, new: 0, updated: 0, unchanged: 0, rejected: 0, ...o });
const base = { template: { id: "t1", version: 3, title: { en: "Eye camp report", hi: null } }, samithi: { id: "s1", slug: "rohini", name: { en: "Rohini", hi: "रोहिणी" } }, uploadedBy: "Asha (Samithi)", loadedAt: null, version: 1, sevaType: "eye" };
const batches: Array<Record<string, any>> = [
  { ...base, id: "b1", fileName: "eye-oct.xlsx", uploadedAt: new Date(Date.now() - 864e5).toISOString(), loadedAt: new Date().toISOString(), status: "loaded", counts: counts({ rows: 12, ok: 12, new: 9, updated: 3 }) },
  { ...base, id: "b2", fileName: "eye-sep.xlsx", uploadedAt: new Date(Date.now() - 9e8).toISOString(), status: "loaded", counts: counts({ rows: 5, ok: 3, new: 3, rejected: 2, errors: 2 }) },
];
const columns = ["date", "samithi_code", "served", "spectacles"].map((header) => ({ header, fieldId: header, kind: "text", locked: false, required: true }));
const previewOf = (id: string) => ({
  ...base, id, fileName: "eye-nov.xlsx", uploadedAt: new Date().toISOString(), status: "preview", counts: counts({ rows: 4, ok: 2, warnings: 1, errors: 1, new: 2, rejected: 1 }),
  columns, sameAs: null,
  rows: [
    { row: 4, cells: { date: "2026-13-40", samithi_code: "ROH", served: "80", spectacles: "70" }, action: "reject", issues: [{ row: 4, column: "date", level: "error", reason: "bad_date", message: { en: "This date does not exist. Use day-month-year.", hi: "यह तारीख़ सही नहीं है। दिन-माह-वर्ष लिखें।" } }] },
    { row: 3, cells: { date: "2026-10-12", samithi_code: "ROH", served: "400", spectacles: "30" }, action: "new", issues: [{ row: 3, column: "served", level: "warn", reason: "number_too_high", message: { en: "400 is much higher than usual. Please check.", hi: "400 सामान्य से बहुत अधिक है। कृपया जाँचें।" } }] },
    { row: 2, cells: { date: "2026-10-05", samithi_code: "ROH", served: "120", spectacles: "90" }, action: "new", issues: [] },
  ],
});

registerFixtures(({ method, path, query, body }) => {
  void body;
  if (path === "/admin/uploads/options") return { data: { sevaTypes: [{ sevaType: "eye", label: { en: "Eye camp", hi: "नेत्र शिविर" }, icon: "eye", templateId: "t1", version: 3, title: { en: "Eye camp report", hi: null } }, { sevaType: "medical", label: { en: "Medical camp", hi: null }, icon: "stethoscope", templateId: "t2", version: 2, title: { en: "Medical", hi: null } }], samithis: [{ id: "s1", slug: "rohini", name: { en: "Rohini", hi: "रोहिणी" }, code: "ROH" }, { id: "s2", slug: "saket", name: { en: "Saket", hi: null }, code: "SKT" }] } };
  if (path === "/admin/uploads/template.xlsx") return { raw: { text: "date,samithi_code,served,spectacles\n", type: "text/csv" } };
  if (path === "/admin/uploads/inbox" && method === "POST") return { status: 201, data: { inboxItemId: "i1" } };
  if (path === "/admin/uploads" && method === "POST") return { status: 201, data: previewOf("b3") };
  if (path === "/admin/uploads") return { data: batches, meta: { total: batches.length, page: 1, pageSize: 20 } };
  let m = path.match(/^\/admin\/uploads\/(\w+)\/confirm$/);
  if (m) return { data: { ...previewOf(m[1]), status: "loaded", counts: counts({ rows: 4, ok: 2, new: 2, rejected: 1, errors: 1 }) } };
  m = path.match(/^\/admin\/uploads\/(\w+)\/(errors\.xlsx|original)$/);
  if (m) return { raw: { text: "x", type: "text/plain" } };
  m = path.match(/^\/admin\/uploads\/(\w+)$/);
  if (m) return { data: previewOf(m[1]) };
  void query;
});
