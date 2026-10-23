// TEMP M6 until backend merge — content fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString();
const unit = (slug: string, en: string, hi: string) => ({ id: `u-${slug}`, slug, name: { en, hi } });
const district = unit("north", "North", "उत्तर");
type Row = { id: string; type: string; category: string | null; title: { en: string; hi: string | null }; body: { en: string; hi: string | null }; district: typeof district | null; status: string; publishAt: string | null; date: string | null; updatedAt: string; legacy: boolean; eventId: string | null; version: number };
const rows: Row[] = [
  { id: "a1", type: "article", category: "news", title: { en: "Eye camp at Rohini serves 340", hi: "रोहिणी नेत्र शिविर" }, body: { en: "<h2>Camp day</h2><p>Volunteers served <strong>340</strong> people.</p>", hi: "<p>शिविर</p>" }, district, status: "published", publishAt: day(-3), date: null, updatedAt: day(-2), legacy: false, eventId: "e1", version: 3 },
  { id: "a2", type: "article", category: "stories", title: { en: "A story about seva", hi: null }, body: { en: "<p>Draft body</p>", hi: null }, district: null, status: "draft", publishAt: null, date: null, updatedAt: day(-1), legacy: false, eventId: null, version: 1 },
  { id: "legacy-41", type: "article", category: "activities", title: { en: "Annual day 2019", hi: null }, body: { en: "<p>Old post</p>", hi: null }, district, status: "published", publishAt: day(-900), date: null, updatedAt: day(-900), legacy: true, eventId: null, version: 0 },
  { id: "a3", type: "article", category: "news", title: { en: "Scheduled news", hi: "निर्धारित" }, body: { en: "<p>Soon</p>", hi: "<p>जल्द</p>" }, district: null, status: "scheduled", publishAt: day(4), date: null, updatedAt: day(0), legacy: false, eventId: null, version: 2 },
  { id: "n1", type: "announcement", category: null, title: { en: "Centre closed on Diwali", hi: null }, body: { en: "Closed 1 Nov.", hi: null }, district: null, status: "published", publishAt: null, date: null, updatedAt: day(-5), legacy: false, eventId: null, version: 1 },
];
const thoughts = new Map<string, Row>();
const t0 = new Date().toISOString().slice(0, 10);
[0, 1, 3, 6].forEach((i) => {
  const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
  thoughts.set(d, { id: `t${i}`, type: "thought_for_day", category: null, title: { en: "", hi: null }, body: { en: `Love all, serve all. (${i})`, hi: i % 2 ? "सबसे प्रेम करो, सबकी सेवा करो" : null }, district: null, status: "published", publishAt: null, date: d, updatedAt: day(-1), legacy: false, eventId: null, version: 1 });
});
void t0;
const item = (r: Row) => ({ kind: "item", id: r.id, type: r.type, key: null, title: r.title, body: r.body, source: { en: "Bhagawan Baba", hi: null }, href: null, date: r.date, startsAt: null, endsAt: null, status: r.status, updatedAt: r.updatedAt, version: r.version });
const detail = (r: Row) =>
  r.type === "article"
    ? { kind: "article", id: r.id, slug: r.id, category: r.category, title: r.title, summary: { en: "Short summary", hi: null }, bodyHtml: r.body, cover: null, gallery: [], district: r.district, event: r.eventId ? { id: "e1", title: { en: "Eye camp at Rohini", hi: null }, sevaType: "eye", startsAt: day(-20), venue: { name: "Centre", address: "", geo: null }, samithi: unit("rohini", "Rohini", "रोहिणी"), district } : null, status: r.status, publishAt: r.publishAt, legacyId: r.legacy ? 41 : null, publicPath: `/news/${r.id}`, updatedAt: r.updatedAt, version: r.version }
    : item(r);
const countsOf = () => ({ all: rows.length, article: 3, news: 2, activities: 1, centenary: 0, home_section: 0, thought_for_day: thoughts.size, announcement: 1 });

registerFixtures(({ method, path, query, body }) => {
  if (path === "/admin/content" && method === "GET") {
    const tab = query.get("tab") ?? "all";
    const q = (query.get("q") ?? "").toLowerCase();
    let list = rows.filter((r) => (tab === "all" ? true : tab === "article" ? r.type === "article" : tab === "news" ? r.category === "news" : tab === "activities" ? r.category === "activities" : tab === "announcement" ? r.type === "announcement" : false));
    if (query.get("status")) list = list.filter((r) => r.status === query.get("status"));
    if (query.get("lang") === "hi_missing") list = list.filter((r) => !r.title.hi || !r.body.hi);
    if (q) list = list.filter((r) => r.title.en.toLowerCase().includes(q));
    return { data: list.map((r) => ({ id: r.id, type: r.type, category: r.category, title: r.title, district: r.district, languages: { en: true, hi: !!r.title.hi }, status: r.status, publishAt: r.publishAt, date: r.date, updatedAt: r.updatedAt, legacy: r.legacy, eventId: r.eventId })), meta: { total: list.length, page: 1, pageSize: 20, counts: countsOf() } };
  }
  if (path === "/admin/content" && method === "POST") {
    const b = body as { kind: string; type?: string; category?: string; title?: Row["title"]; date?: string; body?: Row["body"] };
    const r: Row = { id: `new${rows.length + thoughts.size}`, type: b.kind === "article" ? "article" : (b.type ?? "announcement"), category: b.category ?? null, title: b.title ?? { en: "", hi: null }, body: b.body ?? { en: "", hi: null }, district: null, status: "draft", publishAt: null, date: b.date ?? null, updatedAt: day(0), legacy: false, eventId: null, version: 1 };
    if (r.type === "thought_for_day" && r.date) thoughts.set(r.date, r);
    else rows.unshift(r);
    return { status: 201, data: detail(r) };
  }
  if (path === "/admin/content/thoughts" && method === "GET") {
    const from = new Date(`${query.get("from")}T00:00:00Z`);
    return { data: Array.from({ length: 14 }, (_, i) => { const d = new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10); const r = thoughts.get(d); return { date: d, item: r ? item(r) : null, shown: r ? { text: r.body, source: null, repeated: false } : { text: { en: "Love all, serve all. (0)", hi: null }, source: null, repeated: true } }; }) };
  }
  if (path === "/admin/content/thoughts/import") return { data: { created: 2, updated: 1, errors: [{ row: 4, message: { en: "Date is not valid.", hi: null } }] } };
  if (path === "/admin/content/media") return { status: 201, data: { url: "/media/centres/dev.jpg", width: null, height: null, alt: { en: "photo", hi: null } } };
  let m = path.match(/^\/admin\/content\/from-event\/(\w+)$/);
  if (m) {
    const r: Row = { id: `fe${rows.length}`, type: "article", category: "news", title: { en: "Eye camp at Rohini: 340 people", hi: null }, body: { en: `<p>Summary.</p><div data-event-results="${m[1]}"></div>`, hi: null }, district, status: "draft", publishAt: null, date: null, updatedAt: day(0), legacy: false, eventId: m[1], version: 1 };
    rows.unshift(r);
    return { status: 201, data: detail(r) };
  }
  m = path.match(/^\/admin\/content\/([\w-]+)$/);
  if (m) {
    const r = rows.find((x) => x.id === m![1]) ?? [...thoughts.values()].find((x) => x.id === m![1]);
    if (!r) return { status: 404, data: { code: "NOT_FOUND", message: "Not found" } };
    if (method === "GET") return { data: detail(r) };
    if (method === "DELETE") {
      const i = rows.indexOf(r);
      if (i >= 0) rows.splice(i, 1);
      else thoughts.delete(r.date ?? "");
      return { data: { ok: true } };
    }
    if (method === "PATCH") {
      const b = body as Partial<Row> & { bodyHtml?: Row["body"]; body?: Row["body"] };
      if (b.title) r.title = b.title;
      if (b.bodyHtml) r.body = b.bodyHtml;
      else if (b.body) r.body = b.body;
      if (b.status) r.status = b.status;
      if (b.publishAt !== undefined) r.publishAt = b.publishAt;
      if (b.date) r.date = b.date;
      r.legacy = false;
      r.version += 1;
      r.updatedAt = day(0);
      return { data: detail(r) };
    }
  }
});
