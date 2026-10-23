// TEMP M6 until backend merge — volunteers fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

let notify = true;
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const events = ([
  ["e1", "Eye camp at Rohini", "eye", 3, 6, 5],
  ["e2", "Narayan Seva, Saket", "narayan_seva", 9, 10, 12],
  ["e3", "Medical camp", "medical", 18, null, 2],
] as Array<[string, string, string, number, number | null, number]>).map(([id, en, sevaType, d, needed, joined]) => ({
  event: { id, title: { en, hi: null }, sevaType, startsAt: day(d), venue: { name: "Centre", address: "", geo: null }, samithi: { id: "s1", slug: "rohini", name: { en: "Rohini", hi: "रोहिणी" } }, district: { id: "d1", slug: "north", name: { en: "North", hi: "उत्तर" } } },
  needed, joined, full: needed !== null && joined >= needed, deleteOn: day(d + 30).slice(0, 10),
}));

registerFixtures(({ method, path, body }) => {
  if (path === "/admin/volunteers") return { data: events, meta: { total: events.length, page: 1, pageSize: 12, notifyOnSignup: notify } };
  if (path === "/admin/volunteers/notify" && method === "PATCH") {
    notify = Boolean((body as { notifyOnSignup?: boolean })?.notifyOnSignup);
    return { data: { notifyOnSignup: notify } };
  }
  const m = path.match(/^\/admin\/volunteers\/(\w+)$/);
  if (m) {
    const e = events.find((x) => x.event.id === m[1]);
    const n = e ? Math.min(e.joined, 12) : 0;
    return { data: Array.from({ length: n }, (_, i) => ({ id: `v${i}`, firstName: ["Asha", "Ravi", "Meera", "Karan"][i % 4], phone: "+91 98••• ••" + (10 + i), signedUpAt: day(-i - 1), channel: i % 2 ? "whatsapp" : "web", waitlist: !!e?.needed && i >= e.needed })) };
  }
});
