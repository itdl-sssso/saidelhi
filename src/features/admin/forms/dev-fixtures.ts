// TEMP M6 until backend merge — forms + builder fixtures (dev only, see ../dev-fixtures.ts).
import type { FormDefinition } from "@/contract";
import { kpiFactsFromAnswers, validateAnswers } from "@/contract";
import { bloodCampReport, eyeCampReport } from "@/server/forms/definitions";
import { registerFixtures } from "../dev-fixtures";

interface T {
  id: string;
  code: string;
  sevaType: string | null;
  purpose: string;
  title: { en: string; hi: string | null };
  icon: string;
  published: FormDefinition | null;
  draft: FormDefinition | null;
  draftVersion: number;
  events: number;
}

const tpl = (def: FormDefinition, code: string, icon: string, purpose: string, withDraft: boolean): T => ({
  id: def.templateId,
  code,
  sevaType: purpose === "public" ? null : def.sevaType,
  purpose,
  title: def.title,
  icon,
  published: def,
  draft: withDraft ? { ...structuredClone(def), version: def.version + 1 } : null,
  draftVersion: 1,
  events: 12,
});

const templates: T[] = [tpl(eyeCampReport, "eye_report", "eye", "report", false), tpl(bloodCampReport, "blood_report", "droplet", "report", true)];
const requests: Array<Record<string, unknown>> = [
  { id: "cr1", templateId: eyeCampReport.templateId, templateTitle: eyeCampReport.title, from: { id: "d1", name: { en: "East district", hi: "पूर्व ज़िला" } }, by: "Ritu Sharma", text: "Please add a field for children screened.", urgency: "next_camp", status: "open", createdAt: new Date().toISOString(), decidedAt: null, note: null },
];

const defOf = (x: T) => x.draft ?? x.published;
const count = (d: FormDefinition | null) => (d ? d.sections.flatMap((s) => s.fields).filter((f) => f.kind !== "heading" && f.kind !== "help").length : 0);
const hiMissing = (d: FormDefinition | null) => (d ? d.sections.flatMap((s) => s.fields).filter((f) => !f.label.hi).length : 0);
const row = (x: T) => {
  const d = defOf(x);
  return {
    id: x.id,
    code: x.code,
    sevaType: x.sevaType,
    purpose: x.purpose,
    title: x.title,
    icon: x.icon,
    current: x.published ? { version: x.published.version, publishedAt: "2026-10-02T06:00:00.000Z" } : null,
    draft: x.draft ? { version: x.draft.version, updatedAt: new Date().toISOString() } : null,
    fieldCount: count(d),
    languages: { en: true, hi: hiMissing(d) === 0 },
    missingHi: hiMissing(d),
    eventsThisYear: x.events,
    active: true,
  };
};
const detail = (x: T) => ({
  template: row(x),
  draft: x.draft,
  published: x.published,
  versions: [
    ...(x.draft ? [{ version: x.draft.version, status: "draft", publishedAt: null, publishedBy: null, fieldCount: count(x.draft), linksUsing: 0 }] : []),
    ...(x.published ? [{ version: x.published.version, status: "published", publishedAt: "2026-10-02T06:00:00.000Z", publishedBy: "State admin", fieldCount: count(x.published), linksUsing: 4 }] : []),
  ],
  kpiOptions: [
    { key: "eye.people_screened", label: { en: "People screened", hi: "जाँच किए गए लोग" }, sevaType: "eye" },
    { key: "eye.spectacles", label: { en: "Spectacles given", hi: "दिए गए चश्मे" }, sevaType: "eye" },
    { key: "eye.cataract_referred", label: { en: "Referred for cataract surgery", hi: null }, sevaType: "eye" },
    { key: "blood.units", label: { en: "Blood units collected", hi: null }, sevaType: "blood" },
  ],
  version: x.draft ? x.draftVersion : null,
  can: { edit: true, publish: true },
});

registerFixtures(({ method, path, query, body }) => {
  const b = (body ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (path === "/admin/forms") {
    if (method === "POST") {
      const base = b.fromTemplateId ? templates.find((x) => x.id === b.fromTemplateId) : null;
      const src = base?.published ?? eyeCampReport;
      const id = `new-${templates.length}`;
      const draft: FormDefinition = { ...structuredClone(src), id, templateId: id, version: 1, title: b.title, sevaType: b.sevaType ?? src.sevaType, sections: base ? structuredClone(src.sections) : structuredClone(src.sections).slice(0, 1) };
      templates.push({ id, code: id, sevaType: b.sevaType ?? null, purpose: b.purpose ?? "report", title: b.title, icon: "file-text", published: null, draft, draftVersion: 1, events: 0 });
      return { status: 201, data: detail(templates[templates.length - 1]) };
    }
    return { data: { templates: templates.map(row), changeRequests: requests, can: { build: true, requestChange: false } } };
  }
  let m = path.match(/^\/admin\/forms\/change-requests\/(\w+)$/);
  if (m) {
    const r = requests.find((x) => x.id === m![1]);
    if (!r) return { status: 404, data: { code: "NOT_FOUND", message: "x" } };
    Object.assign(r, b, { decidedAt: new Date().toISOString() });
    return { data: r };
  }
  m = path.match(/^\/admin\/forms\/([\w-]+)(?:\/(\w+))?$/);
  if (m) {
    const x = templates.find((t) => t.id === m![1]);
    if (!x) return { status: 404, data: { code: "NOT_FOUND", message: "x" } };
    const act = m[2];
    if (!act) {
      if (method === "PATCH") {
        if (b.version !== null && b.version !== x.draftVersion) return { status: 409, data: { code: "CONFLICT", message: "changed" } };
        x.draft = { ...b.definition, version: (x.published?.version ?? 0) + 1 };
        x.draftVersion += 1;
      }
      return { data: detail(x) };
    }
    if (act === "publish") {
      if (!x.draft) return { status: 422, data: { code: "VALIDATION", message: "No draft" } };
      x.published = x.draft;
      x.draft = null;
      return { data: detail(x) };
    }
    if (act === "duplicate") {
      const id = `dup-${templates.length}`;
      const def = structuredClone(defOf(x)!);
      templates.push({ ...x, id, code: id, title: b.title, published: null, draft: { ...def, id, templateId: id, version: 1, title: b.title }, draftVersion: 1, events: 0 });
      return { status: 201, data: detail(templates[templates.length - 1]) };
    }
    if (act === "test") {
      const def = defOf(x)!;
      const v = validateAnswers(def, b.answers ?? {});
      const msgs = (list: Array<{ path: string; message: { en: string; hi: string | null } }>) => Object.fromEntries(list.map((i) => [i.path, i.message.en]));
      return { data: { ok: v.errors.length === 0, errors: msgs(v.errors as never), warnings: msgs(v.warnings as never), kpis: v.errors.length ? [] : kpiFactsFromAnswers(def, v.clean as never) } };
    }
    if (act === "change-requests") return { status: 201, data: { id: "cr-new", templateId: x.id, templateTitle: x.title, from: null, by: "You", text: b.text, urgency: b.urgency, status: "open", createdAt: new Date().toISOString(), decidedAt: null, note: null } };
    if (act === "versions") return { data: detail(x).versions };
  }
  if (/\/template\.xlsx$/.test(path)) return { raw: { text: "samithi_code,date\n", type: "text/csv" } };
  void query;
  return undefined;
});
