// TEMP M6 until backend merge — follow-up fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const rows = (
  [
    ["Ramvati Devi", 67, "female", "Mayur Vihar", "9810011122", "referred", 20],
    ["Mohan Lal", 72, "male", "Rohini Sec 7", "9810033344", "scheduled", 11],
    ["Sunita", 58, "female", "Saket", null, "unreachable", 30],
    ["Hari Singh", 64, "male", "Noida 62", "9810055566", "done", 40],
  ] as Array<[string, number, "female" | "male", string, string | null, string, number]>
).map(([name, age, gender, locality, phone, status, w], i) => ({
  id: `f${i + 1}`, name, age, gender, locality, phone: phone ? `+91 ${phone.slice(0, 2)}••• •••${phone.slice(-2)}` : null, raw: phone,
  camp: { eventId: "e1", title: { en: "Eye camp at Mayur Vihar", hi: null }, date: day(-w).slice(0, 10), samithi: { id: "s1", slug: "mv", name: { en: "Mayur Vihar", hi: "मयूर विहार" } } },
  referredAt: day(-w).slice(0, 10), status, surgeryDate: status === "scheduled" ? day(5).slice(0, 10) : null, daysWaiting: w, consent: i !== 2, lastContactAt: null, deleteOn: day(300).slice(0, 10), version: 1,
  history: [{ at: day(-w), by: null, kind: "referred", text: "Referred at the camp. Consent recorded." }] as Array<{ at: string; by: string | null; kind: string; text: string }>,
}));
const strip = (r: (typeof rows)[number]) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "raw" && k !== "history"));
registerFixtures(({ method, path, query, body }) => {
  if (path === "/admin/follow-up" && method === "GET") {
    const st = query.get("status") ?? "open";
    const q = (query.get("q") ?? "").toLowerCase();
    const list = rows.filter((r) => (st === "all" ? true : st === "open" ? r.status !== "done" && r.status !== "declined" : r.status === st) && r.name.toLowerCase().includes(q));
    return { data: list.map(strip), meta: { total: list.length, page: 1, pageSize: 20 } };
  }
  const m = path.match(/^\/admin\/follow-up\/(\w+)(\/reveal-phone|\/calls)?$/);
  if (!m) return;
  const r = rows.find((x) => x.id === m[1]);
  if (!r) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
  if (m[2] === "/reveal-phone") {
    r.history.unshift({ at: new Date().toISOString(), by: "You", kind: "revealed", text: "Phone revealed" });
    return { data: { phone: `+91 ${r.raw}` } };
  }
  const b = (body ?? {}) as { status?: string; surgeryDate?: string | null; note?: string; outcome?: string };
  if (m[2] === "/calls") r.history.unshift({ at: new Date().toISOString(), by: "You", kind: "call", text: `Call logged · ${b.outcome}` });
  else if (method === "PATCH") {
    if (b.status) { r.status = b.status; r.history.unshift({ at: new Date().toISOString(), by: "You", kind: "status", text: `Status: ${b.status}` }); }
    if (b.surgeryDate !== undefined) r.surgeryDate = b.surgeryDate;
    if (b.note) r.history.unshift({ at: new Date().toISOString(), by: "You", kind: "note", text: b.note });
  }
  if (method !== "GET") r.version += 1;
  return { data: { ...strip(r), history: r.history } };
});
