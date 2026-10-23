/* eslint-disable @typescript-eslint/no-explicit-any */
// TEMP M6 until backend merge — centres fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const u = (id: string, en: string, hi: string) => ({ id, slug: id, name: { en, hi } });
const centres: Array<Record<string, any>> = [
  { id: "c1", slug: "rohini", name: { en: "Rohini Centre", hi: "रोहिणी केंद्र" }, address: { en: "Sector 7, Rohini, Delhi", hi: null }, pincode: "110085", geo: { lat: 28.7041, lng: 77.1025 }, contactPhone: "+91 11 2755 0000", schedule: [{ day: 0, time: "10:00", kind: "bal_vikas", language: "hi" }, { day: 4, time: "18:30", kind: "bhajan", language: "mixed" }], photos: [], active: true, district: u("d1", "North", "उत्तर"), samithi: u("s1", "Rohini", "रोहिणी"), version: 1 },
  { id: "c2", slug: "saket", name: { en: "Saket Centre", hi: null }, address: { en: "Press Enclave Road, Saket", hi: null }, pincode: null, geo: null, contactPhone: null, schedule: [], photos: [], active: true, district: u("d2", "South", "दक्षिण"), samithi: u("s2", "Saket", "साकेत"), version: 1 },
];
const row = (c: Record<string, any>) => ({ id: c.id, slug: c.slug, name: c.name, district: c.district, samithi: c.samithi, active: c.active, hasGeo: !!c.geo, hasPhone: !!c.contactPhone, gatherings: c.schedule.length, photos: c.photos.length, languages: { en: true, hi: !!c.name.hi }, updatedAt: new Date().toISOString() });

registerFixtures(({ method, path, query, body }) => {
  if (path === "/admin/centres") {
    const q = (query.get("q") ?? "").toLowerCase();
    const out = centres.filter((c) => (!q || c.name.en.toLowerCase().includes(q)) && (query.get("active") !== "false" || !c.active)).map(row);
    return { data: out, meta: { total: out.length, page: 1, pageSize: 25 } };
  }
  let m = path.match(/^\/admin\/centres\/(\w+)\/photos$/);
  if (m && method === "POST") return { status: 201, data: { url: "/icon.svg", width: 400, height: 300, alt: { en: "Uploaded photo", hi: null } } };
  m = path.match(/^\/admin\/centres\/(\w+)$/);
  if (m) {
    const c = centres.find((x) => x.id === m![1]);
    if (!c) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    if (method === "PATCH") Object.assign(c, body, { version: c.version + 1 });
    return { data: { ...c, samithiId: c.samithi.id, publicPath: `/centres/${c.slug}`, updatedAt: new Date().toISOString() } };
  }
});
