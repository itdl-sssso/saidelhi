// TEMP M6 until backend merge — impact fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const kpiDefs = [
  ["people_served", "People served", "लोगों की सेवा"],
  ["meals", "Meals served", "भोजन वितरित"],
  ["eye_checkups", "Eye check-ups", "नेत्र जाँच"],
  ["blood_units", "Blood units", "रक्त इकाइयाँ"],
  ["saplings", "Saplings planted", "पौधे रोपे"],
] as const;
const state = {
  version: 1,
  showEstimates: true,
  tip: { en: "Rough figures from before the platform, entered by district coordinators.", hi: null as string | null },
  kpis: kpiDefs.map(([key, en, hi], i) => ({ key, label: { en, hi }, icon: "heart", publicImpact: i !== 4, homeTile: i < 3, note: i === 0 ? { en: "Counts services given, not unique people.", hi: null } : null, current: { value: [48210, 120400, 6120, 410, 2210][i], estimate: false } })),
};
type Est = { id: string; district: { id: string; slug: string; name: { en: string; hi: string } }; year: number; month: string | null; sevaType: string | null; kpiKey: string; kpiLabel: { en: string; hi: string }; value: number; source: string; enteredBy: string; visible: boolean; createdAt: string };
const north = { id: "d1", slug: "north", name: { en: "North", hi: "उत्तर" } };
const ests: Est[] = [
  { id: "x1", district: north, year: 2019, month: null, sevaType: "narayan_seva", kpiKey: "meals", kpiLabel: { en: "Meals served", hi: "भोजन वितरित" }, value: 30000, source: "Samithi diary", enteredBy: "State Admin", visible: true, createdAt: new Date().toISOString() },
  { id: "x2", district: north, year: 2020, month: "2020-03", sevaType: null, kpiKey: "people_served", kpiLabel: { en: "People served", hi: "लोगों की सेवा" }, value: 5200, source: "Annual report", enteredBy: "State Admin", visible: false, createdAt: new Date().toISOString() },
];
const payload = () => ({
  kpis: state.kpis, showEstimates: state.showEstimates, estimateTooltip: state.tip, version: state.version,
  preview: state.kpis.filter((k) => k.publicImpact && k.homeTile).map((k) => ({ key: k.key, label: k.label, figure: k.current, period: { from: null, to: new Date().toISOString().slice(0, 10), label: { en: "All time", hi: "अब तक" } }, note: k.note ?? undefined })),
});
let n = 10;
registerFixtures(({ method, path, body }) => {
  if (path === "/admin/impact" && method === "GET") return { data: payload() };
  if (path === "/admin/impact" && method === "PATCH") {
    const b = body as { kpis?: Array<{ key: string; publicImpact: boolean; homeTile: boolean; note?: { en: string; hi: string | null } | null }>; showEstimates?: boolean; estimateTooltip?: { en: string; hi: string | null } };
    if (b.kpis && b.kpis.filter((k) => k.homeTile).length > 4) return { status: 422, data: { code: "VALIDATION", message: "At most 4 home tiles.", fields: {} } };
    b.kpis?.forEach((k) => Object.assign(state.kpis.find((x) => x.key === k.key) ?? {}, { publicImpact: k.publicImpact, homeTile: k.homeTile, note: k.note ?? null }));
    if (b.showEstimates !== undefined) state.showEstimates = b.showEstimates;
    if (b.estimateTooltip) state.tip = b.estimateTooltip;
    state.version += 1;
    return { data: payload() };
  }
  if (path === "/admin/impact/estimates" && method === "GET") return { data: ests, meta: { total: ests.length, page: 1, pageSize: 20 } };
  if (path === "/admin/impact/estimates" && method === "POST") {
    const b = body as Record<string, unknown>;
    const k = state.kpis.find((x) => x.key === b.kpiKey);
    const e = { ...b, id: `x${n++}`, district: north, kpiLabel: k?.label ?? { en: String(b.kpiKey), hi: "" }, enteredBy: "State Admin", createdAt: new Date().toISOString() } as unknown as Est;
    ests.unshift(e);
    return { status: 201, data: e };
  }
  const m = path.match(/^\/admin\/impact\/estimates\/(\w+)$/);
  if (m) {
    const i = ests.findIndex((x) => x.id === m[1]);
    if (i < 0) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    if (method === "DELETE") { ests.splice(i, 1); return { data: { ok: true } }; }
    Object.assign(ests[i], body as object);
    return { data: ests[i] };
  }
});
