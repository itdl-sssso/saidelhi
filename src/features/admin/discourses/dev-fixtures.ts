// TEMP M7: in-memory placeholder store for the workspace until backend B2 (`/api/v1/admin/discourses*`) merges.
// Placeholder text only; real discourse text is copyrighted and never committed. Used by api.ts ONLY in dev when
// the real route is missing (non-JSON 404). Delete this file and the fixture branches in api.ts after B2 lands.
import {
  type AdminDiscourseBlock,
  type AdminDiscourseDetail,
  type AdminDiscourseRow,
  type AdminDiscoursesQuery,
  type DiscourseCreate,
  type DiscoursePatch,
  type DiscourseStatus,
  type DiscourseTheme,
  type GlossaryTerm,
  approveBlockers,
  glossaryIssues,
  publishBlockers,
  quoteMatches,
} from "@/contract";

export type FxOk<T> = { ok: true; status: number; data: T; meta?: unknown };
export type FxErr = { ok: false; status: number; error: { code: string; message: string; fields?: Record<string, string> } };
export type FxResult<T> = FxOk<T> | FxErr;

const GLOSSARY: GlossaryTerm[] = [
  { term: "sample-term", hi: "नमूना-शब्द", gloss: "Placeholder glossary term" },
  { term: "placeholder-virtue", hi: "प्लेसहोल्डर-गुण", gloss: null },
];

const REVIEWERS = [
  { id: "r1", name: "Placeholder Reviewer One" },
  { id: "r2", name: "Placeholder Reviewer Two" },
];

type Store = AdminDiscourseDetail & { aiDraft: Record<string, string> };

const para = (n: number) => `Placeholder paragraph ${n} with a sample-term inside it. The approved English text goes here.`;
const paraHi = (n: number) => `प्लेसहोल्डर अनुच्छेद ${n} नमूना-शब्द के साथ।`;

function build(n: number, themes: DiscourseTheme[], status: DiscourseStatus): Store {
  const approved = status === "approved" || status === "published";
  const fresh = status === "not_started";
  const blocks: AdminDiscourseBlock[] = [
    { id: `d${n}b1`, idx: 1, type: "heading", en: "Placeholder heading", hi: approved ? "प्लेसहोल्डर शीर्षक" : null, status: approved ? "approved" : "empty", hasAiDraft: true, glossaryIssues: [] },
    { id: `d${n}b2`, idx: 2, type: "para", en: para(1), hi: fresh ? null : paraHi(1), status: approved ? "approved" : fresh ? "empty" : "ai_draft", hasAiDraft: true, glossaryIssues: [] },
    { id: `d${n}b3`, idx: 3, type: "para", en: para(2), hi: fresh ? null : "प्लेसहोल्डर अनुच्छेद 2।", status: approved ? "approved" : fresh ? "empty" : "edited", hasAiDraft: true, glossaryIssues: [] },
    { id: `d${n}b4`, idx: 4, type: "poem", en: "Placeholder verse line one\nPlaceholder verse line two", hi: approved ? "प्लेसहोल्डर पद्य एक\nप्लेसहोल्डर पद्य दो" : null, status: approved ? "approved" : "empty", hasAiDraft: false, glossaryIssues: [] },
    { id: `d${n}b5`, idx: 5, type: "para", en: para(3), hi: approved ? paraHi(3) : null, status: approved ? "approved" : "empty", hasAiDraft: true, glossaryIssues: [] },
  ];
  for (const b of blocks) b.glossaryIssues = glossaryIssues(b.en, b.hi, GLOSSARY);
  const aiDraft = Object.fromEntries(blocks.filter((b) => b.hasAiDraft).map((b) => [b.id, `प्लेसहोल्डर मसौदा ${b.idx} नमूना-शब्द`]));
  return {
    id: `fx${n}`,
    n,
    slug: `placeholder-${n}`,
    title: { en: `Placeholder discourse ${n}`, hi: approved ? `प्लेसहोल्डर प्रवचन ${n}` : null },
    why: { en: "Placeholder line on why this talk matters.", hi: null },
    meta: { collPrint: `Placeholder Vol ${n}, Ch ${n}`, collOnline: null, date: `0${n} October 197${n}`, isoDate: null, place: "Placeholder place", occasion: "Placeholder occasion", sourceUrl: null, pdfUrl: null, retrieved: null },
    themes,
    status,
    reviewer: fresh ? null : REVIEWERS[0],
    blocks,
    quotes: approved ? [{ en: "Placeholder paragraph 1", hi: null, blockId: `d${n}b2` }, { en: "Placeholder paragraph 2", hi: null, blockId: `d${n}b3` }] : [],
    notes: ["Placeholder translator note."],
    publishedAt: status === "published" ? "2026-10-01T00:00:00.000Z" : null,
    flagOn: true,
    publishBlockers: [],
    reviewers: REVIEWERS,
    can: { edit: true, review: true, publish: true },
    version: 1,
    aiDraft,
  };
}

const DB: Store[] = [
  build(1, ["character", "education"], "not_started"),
  build(2, ["discipline"], "ai_draft"),
  build(3, ["service", "friendship"], "in_review"),
  build(4, ["time"], "approved"),
  build(5, ["mental_peace", "habits"], "published"),
];

const strip = (s: Store): AdminDiscourseDetail => {
  const { aiDraft: _ignored, ...d } = s;
  void _ignored;
  return { ...d, publishBlockers: publishBlockers(d.status, d.flagOn) };
};
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const err = (status: number, code: string, message: string, fields?: Record<string, string>): FxErr => ({ ok: false, status, error: { code, message, fields } });
const find = (id: string) => DB.find((d) => d.id === id);

export const fx = {
  glossary: (): FxResult<GlossaryTerm[]> => ({ ok: true, status: 200, data: clone(GLOSSARY) }),

  list(q: Partial<AdminDiscoursesQuery>): FxResult<AdminDiscourseRow[]> {
    const needle = q.q?.toLowerCase();
    const items = DB.filter(
      (d) =>
        (!q.theme || d.themes.includes(q.theme)) &&
        (!q.status || d.status === q.status) &&
        (!q.reviewer || (q.reviewer === "none" ? !d.reviewer : d.reviewer?.id === q.reviewer)) &&
        (!needle || `${d.title.en} ${d.title.hi ?? ""} ${d.meta.place}`.toLowerCase().includes(needle)),
    );
    const counts: Record<string, number> = { all: DB.length };
    for (const d of DB) counts[d.status] = (counts[d.status] ?? 0) + 1;
    const rows: AdminDiscourseRow[] = items.map((d) => ({
      id: d.id,
      n: d.n,
      slug: d.slug,
      title: d.title,
      coll: d.meta.collPrint,
      themes: d.themes,
      status: d.status,
      reviewer: d.reviewer,
      blocks: { total: d.blocks.length, approved: d.blocks.filter((b) => b.status === "approved").length, empty: d.blocks.filter((b) => b.status === "empty").length },
      updatedAt: "2026-10-20T10:00:00.000Z",
    }));
    return { ok: true, status: 200, data: rows, meta: { total: rows.length, page: 1, pageSize: 25, counts, flagOn: true, published: counts.published ?? 0 } };
  },

  detail(id: string): FxResult<AdminDiscourseDetail> {
    const d = find(id);
    return d ? { ok: true, status: 200, data: clone(strip(d)) } : err(404, "NOT_FOUND", "Not found");
  },

  create(body: DiscourseCreate): FxResult<AdminDiscourseDetail> {
    const n = DB.length + 1;
    const d = build(n, body.themes, "not_started");
    const paras = body.sourceText.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    d.title = { en: body.title.en, hi: body.title.hi };
    d.why = { en: body.why.en, hi: body.why.hi };
    d.meta = { ...body.meta, isoDate: null };
    d.blocks = paras.map((en, i) => ({ id: `d${n}b${i + 1}`, idx: i + 1, type: "para", en, hi: null, status: "empty", hasAiDraft: false, glossaryIssues: [] }));
    d.aiDraft = {};
    d.reviewer = null;
    DB.push(d);
    return { ok: true, status: 201, data: clone(strip(d)) };
  },

  patch(id: string, body: DiscoursePatch): FxResult<AdminDiscourseDetail> {
    const d = find(id);
    if (!d) return err(404, "NOT_FOUND", "Not found");
    if (body.version !== d.version) return err(409, "CONFLICT", "Changed elsewhere");
    for (const [i, q] of (body.quotes ?? []).entries()) {
      if (!quoteMatches(q, d.blocks)) return err(422, "VALIDATION", "Quote must be verbatim", { [`quotes.${i}`]: "Quote must match the paragraph text exactly." });
    }
    for (const p of body.blocks ?? []) {
      const b = d.blocks.find((x) => x.id === p.id);
      if (!b) continue;
      const nextHi = p.hi === undefined ? b.hi : p.hi;
      if (p.status === "approved" && !(nextHi ?? "").trim()) return err(422, "VALIDATION", "Hindi is empty", { [`blocks.${p.id}`]: "Write the Hindi before approving." });
    }
    for (const p of body.blocks ?? []) {
      const b = d.blocks.find((x) => x.id === p.id);
      if (!b) continue;
      if (p.hi !== undefined) b.hi = p.hi && p.hi.length ? p.hi : null;
      b.status = p.status ?? (p.hi !== undefined ? (b.hi ? "edited" : "empty") : b.status);
      b.glossaryIssues = glossaryIssues(b.en, b.hi, GLOSSARY);
      if (p.hi !== undefined && d.status !== "in_review") d.status = "in_review";
    }
    if (body.title) d.title = body.title;
    if (body.why) d.why = body.why;
    if (body.themes) d.themes = body.themes;
    if (body.reviewerId !== undefined) d.reviewer = REVIEWERS.find((r) => r.id === body.reviewerId) ?? null;
    if (body.quotes) d.quotes = body.quotes;
    d.version += 1;
    return { ok: true, status: 200, data: clone(strip(d)) };
  },

  action(id: string, action: "ai-draft" | "send-review" | "approve" | "publish" | "unpublish", body: { version: number; reviewerId?: string; blockIds?: string[] }): FxResult<AdminDiscourseDetail> {
    const d = find(id);
    if (!d) return err(404, "NOT_FOUND", "Not found");
    if (body.version !== d.version) return err(409, "CONFLICT", "Changed elsewhere");
    if (action === "ai-draft") {
      const targets = d.blocks.filter((b) => b.hasAiDraft && (body.blockIds ? body.blockIds.includes(b.id) : b.status === "empty"));
      if (!targets.length) return err(422, "VALIDATION", "No AI draft stored");
      for (const b of targets) {
        b.hi = d.aiDraft[b.id];
        b.status = "ai_draft";
        b.glossaryIssues = glossaryIssues(b.en, b.hi, GLOSSARY);
      }
      if (d.status === "not_started") d.status = "ai_draft";
    } else if (action === "send-review") {
      const reviewer = body.reviewerId ? REVIEWERS.find((r) => r.id === body.reviewerId) : d.reviewer;
      if (!reviewer) return err(422, "VALIDATION", "Needs a reviewer", { reviewerId: "Choose a reviewer first." });
      d.reviewer = reviewer;
      d.status = "in_review";
    } else if (action === "approve") {
      const bl = approveBlockers(d);
      if (bl.length) return err(422, "VALIDATION", "Cannot approve", Object.fromEntries(bl.map((k) => [k, k])));
      d.status = "approved";
    } else if (action === "publish") {
      const bl = publishBlockers(d.status, d.flagOn);
      if (bl.length) return err(422, "VALIDATION", "Cannot publish", Object.fromEntries(bl.map((k) => [k, k])));
      d.status = "published";
      d.publishedAt = new Date().toISOString();
    } else {
      d.status = "approved";
      d.publishedAt = null;
    }
    d.version += 1;
    return { ok: true, status: 200, data: clone(strip(d)) };
  },
};
