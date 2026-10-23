// TEMP M6 until backend merge — migration + redirects fixtures (dev only, see ../dev-fixtures.ts).
import { registerFixtures } from "../dev-fixtures";

const now = () => new Date().toISOString();
const types = [
  { sourceType: "post:N", label: "News posts", items: 412, becomes: "news", risky: false },
  { sourceType: "post:A", label: "Activities", items: 233, becomes: "activities", risky: false },
  { sourceType: "post:P", label: "Personal stories", items: 58, becomes: "stories", risky: true },
  { sourceType: "page:about-us", label: "About us page", items: 1, becomes: "redirect_only", risky: false },
];
const issues = [
  { ref: "post-1021", title: "Annual day 2014", problem: "no_date", fixPath: "/admin/content/legacy-1021" },
  { ref: "post-877", title: "Medical camp notice", problem: "personal_data", fixPath: "/admin/content/legacy-877" },
  { ref: "post-310", title: "देवी पूजा", problem: "hindi_only", fixPath: "/admin/content/legacy-310" },
];
let run: Record<string, unknown> | null = { id: "m1", source: "legacy_db", fileName: null, status: "mapping", startedAt: now(), finishedAt: null, by: "State Admin", types, counts: { items: 704, imported: 0, skipped: 0, needsFix: 3, redirects: 700 }, issues, version: 1 };
const reds = [
  { from: "/news/index", to: "/news", permanent: true, source: "rule", hits: 120, updatedAt: now() },
  { from: "/post/1021", to: "/news/annual-day-2014", permanent: true, source: "migration", hits: 4, updatedAt: now() },
  { from: "/old-centre", to: "/centres", permanent: false, source: "manual", hits: 0, updatedAt: now() },
];
registerFixtures(({ method, path, query, body }) => {
  if (path === "/admin/migration/runs" && method === "GET") return { data: run ? [run] : [] };
  if (path === "/admin/migration/runs" && method === "POST") {
    run = { ...run!, id: "m2", status: "mapping", version: 1, counts: { items: 704, imported: 0, skipped: 0, needsFix: 3, redirects: 700 } };
    return { status: 201, data: run };
  }
  let m = path.match(/^\/admin\/migration\/runs\/(\w+)\/import$/);
  if (m && run) {
    run = { ...run, status: "done", finishedAt: now(), version: (run.version as number) + 1, counts: { items: 704, imported: 690, skipped: 11, needsFix: 3, redirects: 700 } };
    return { data: run };
  }
  m = path.match(/^\/admin\/migration\/runs\/(\w+)\/report\.csv$/);
  if (m) return { raw: { text: "ref,title,problem\npost-1021,Annual day 2014,no_date\n", type: "text/csv" } };
  m = path.match(/^\/admin\/migration\/runs\/(\w+)$/);
  if (m && run && method === "PATCH") {
    const b = body as { types: Array<{ sourceType: string; becomes: string }> };
    run = { ...run, version: (run.version as number) + 1, types: types.map((x) => ({ ...x, becomes: b.types.find((y) => y.sourceType === x.sourceType)?.becomes ?? x.becomes })) };
    return { data: run };
  }
  if (path === "/admin/redirects" && method === "GET") {
    const q = (query.get("q") ?? "").toLowerCase();
    const list = reds.filter((r) => (!query.get("source") || r.source === query.get("source")) && (!q || r.from.includes(q) || r.to.includes(q)));
    return { data: list, meta: { total: list.length, page: 1, pageSize: 25 } };
  }
  if (path === "/admin/redirects" && method === "POST") {
    const b = body as { from: string; to: string; permanent: boolean };
    const i = reds.findIndex((r) => r.from === b.from);
    const row = { ...b, source: "manual", hits: i >= 0 ? reds[i].hits : 0, updatedAt: now() };
    if (i >= 0) reds[i] = row;
    else reds.unshift(row);
    return { status: 201, data: row };
  }
  if (path === "/admin/redirects" && method === "DELETE") {
    const i = reds.findIndex((r) => r.from === query.get("from"));
    if (i >= 0) reds.splice(i, 1);
    return { data: { ok: true } };
  }
});
