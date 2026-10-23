// Form templates + builder (specs 30-31): list/detail, draft edits, publish gate,
// duplicate, dry-run test, versions, change requests and the Excel template.
import {
  builderChecks,
  type ChangeRequestCreate,
  type ChangeRequestDecision,
  type FormChangeRequest,
  type FormDefinition,
  type FormDraftPatch,
  type FormDuplicateBody,
  type FormField,
  type FormsPayload,
  type FormTemplateCreate,
  type FormTemplateDetail,
  type FormTemplateRow,
  type FormTestBody,
  type FormTestResult,
  type FormVersionSummary,
  fieldCount,
  issuesToFieldMap,
  kpiFactsFromAnswers,
  type Locale,
  missingHindi,
  type SevaType,
  validateAnswers,
} from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan, can } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { aboutSection, section, t } from "../../forms/definitions";
import { istYear, toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { FormVersionRec, TemplateRec } from "../../repo/links-types";
import { buildTemplateXlsx } from "../../xlsx/template";
import { loadKpiDefinitions } from "../kpis";
import { i18n } from "../org-index";
import { loadOrg, type PortalCtx } from "./shared";

export interface FormsService {
  list(actor: Actor): Promise<FormsPayload>;
  create(actor: Actor, body: FormTemplateCreate): Promise<FormTemplateDetail>;
  detail(actor: Actor, id: string): Promise<FormTemplateDetail>;
  patchDraft(actor: Actor, id: string, body: FormDraftPatch): Promise<FormTemplateDetail>;
  publish(actor: Actor, id: string, version: number): Promise<FormTemplateDetail>;
  duplicate(actor: Actor, id: string, body: FormDuplicateBody): Promise<FormTemplateDetail>;
  test(actor: Actor, id: string, body: FormTestBody): Promise<FormTestResult>;
  versions(actor: Actor, id: string): Promise<FormVersionSummary[]>;
  versionDefinition(actor: Actor, id: string, version: number): Promise<FormDefinition>;
  templateXlsx(actor: Actor, id: string, q: { samithi?: string; version?: number }): Promise<{ bytes: Uint8Array; filename: string }>;
  createChangeRequest(actor: Actor, id: string, body: ChangeRequestCreate): Promise<FormChangeRequest>;
  decideChangeRequest(actor: Actor, requestId: string, body: ChangeRequestDecision): Promise<FormChangeRequest>;
}

interface ChangeRequestData {
  templateId: string;
  fromId: string | null;
  byId: string;
  by: string;
  text: string;
  urgency: FormChangeRequest["urgency"];
  status: FormChangeRequest["status"];
  decidedAt: string | null;
  note: string | null;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "form";

/** Plain-language reason per failing publish check. */
const CHECK_MESSAGES: Record<string, string> = {
  structure: "The form has a structural problem.",
  core_fields: "A required core question is missing or no longer locked.",
  kpi_unique: "Two questions feed the same number on the dashboard.",
  hi_labels: "Add the Hindi text before publishing.",
  personal_consent: "Add a consent question to the section with personal details.",
  personal_retention: "Choose how long personal answers are kept.",
  no_id_numbers: "Do not ask for ID numbers (Aadhaar, PAN and similar).",
};

const topFields = (def: FormDefinition) => def.sections.flatMap((s) => s.fields);

/** Locked questions of `prev` that are missing or unlocked in `next`. */
export function lockedProblems(prev: FormDefinition | null, next: FormDefinition): string[] {
  if (!prev) return [];
  const now = new Map(topFields(next).map((f) => [f.id, f]));
  return topFields(prev)
    .filter((f) => f.locked)
    .filter((f) => !now.get(f.id)?.locked)
    .map((f) => f.id);
}

function duplicateIds(def: FormDefinition): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const f of topFields(def)) (seen.has(f.id) ? dup : seen).add(f.id);
  return [...dup];
}

export function blankDefinition(ids: { id: string; templateId: string }, version: number, title: FormDefinition["title"], sevaType: SevaType | null, purpose: string): FormDefinition {
  const sections =
    purpose === "report"
      ? [aboutSection(t("Partner", "साझेदार")), section("details", t("Details", "विवरण"), [])]
      : [section("details", t("Details", "विवरण"), [])];
  return { id: ids.id, templateId: ids.templateId, version, sevaType: sevaType ?? "other", title, sections };
}

export function createFormsService(ctx: PortalCtx): FormsService {
  const { repo, deps } = ctx;
  const now = () => deps.now();

  const manage = (a: Actor) => can(a, "forms.manage");

  async function templateOr404(id: string): Promise<TemplateRec> {
    const tpl = (await repo.links.templates()).find((x) => x.id === id);
    if (!tpl) throw new ApiError("NOT_FOUND");
    return tpl;
  }

  function split(versions: FormVersionRec[]) {
    const published = [...versions].filter((v) => v.status === "published").sort((a, b) => b.version - a.version)[0] ?? null;
    const draft = versions.find((v) => v.status === "draft") ?? null;
    return { published, draft };
  }

  async function row(tpl: TemplateRec, versions: FormVersionRec[], org: Awaited<ReturnType<typeof loadOrg>>, canSeeDraft: boolean): Promise<FormTemplateRow> {
    const { published, draft } = split(versions);
    const shownDraft = canSeeDraft ? draft : null;
    const basis = published ?? shownDraft;
    const missingDef = shownDraft ?? published;
    const year = istYear(now());
    let events = 0;
    if (tpl.sevaType) {
      const res = await repo.portal.listAdminEvents({
        sevaType: tpl.sevaType,
        from: new Date(`${year}-01-01T00:00:00+05:30`),
        to: new Date(`${year + 1}-01-01T00:00:00+05:30`),
        sort: "-startsAt",
        limit: 1,
        offset: 0,
      });
      events = res.total;
    }
    return {
      id: tpl.id,
      code: tpl.code,
      sevaType: tpl.sevaType,
      purpose: tpl.purpose,
      title: i18n(tpl.titleEn, tpl.titleHi),
      icon: (tpl.sevaType && org.sevaType(tpl.sevaType)?.icon) || "file-text",
      current: published?.publishedAt ? { version: published.version, publishedAt: toIso(published.publishedAt) } : null,
      draft: shownDraft ? { version: shownDraft.version, updatedAt: toIso(shownDraft.updatedAt ?? now()) } : null,
      fieldCount: basis ? fieldCount(basis.definition) : 0,
      languages: { en: true, hi: missingDef ? missingHindi(missingDef.definition).length === 0 : false },
      missingHi: missingDef ? missingHindi(missingDef.definition).filter((x) => !x.startsWith("section:")).length : 0,
      eventsThisYear: events,
      active: tpl.active,
    };
  }

  async function toDetail(actor: Actor, tpl: TemplateRec): Promise<FormTemplateDetail> {
    const [versions, org, kpis, counts] = await Promise.all([repo.links.versionsOf(tpl.id), loadOrg(repo), loadKpiDefinitions(repo), repo.links.activeLinkCounts(now())]);
    const edit = manage(actor);
    const { published, draft } = split(versions);
    const names = new Map((await repo.portal.usersByIds([...new Set(versions.map((v) => v.publishedBy).filter((x): x is string => !!x))])).map((u) => [u.id, u.name]));
    return {
      template: await row(tpl, versions, org, edit),
      draft: edit && draft ? draft.definition : null,
      published: published?.definition ?? null,
      versions: versions
        .filter((v) => edit || v.status === "published")
        .sort((a, b) => b.version - a.version)
        .map((v) => ({
          version: v.version,
          status: v.status,
          publishedAt: toIsoOrNull(v.publishedAt),
          publishedBy: v.publishedBy ? (names.get(v.publishedBy) ?? null) : null,
          fieldCount: fieldCount(v.definition),
          linksUsing: counts.get(v.id) ?? 0,
        })),
      kpiOptions: kpis.map((k) => ({ key: k.key, label: k.label, sevaType: k.sevaType })),
      version: edit && draft ? (draft.rev ?? 1) : null,
      can: { edit, publish: edit },
    };
  }

  async function requestRow(r: { id: string; createdAt: Date; data: ChangeRequestData }, org: Awaited<ReturnType<typeof loadOrg>>, titles: Map<string, TemplateRec>): Promise<FormChangeRequest> {
    const tpl = titles.get(r.data.templateId);
    return {
      id: r.id,
      templateId: r.data.templateId,
      templateTitle: tpl ? i18n(tpl.titleEn, tpl.titleHi) : { en: "Deleted form", hi: null },
      from: r.data.fromId ? org.ref(r.data.fromId) : null,
      by: r.data.by,
      text: r.data.text,
      urgency: r.data.urgency,
      status: r.data.status,
      createdAt: toIso(r.createdAt),
      decidedAt: r.data.decidedAt,
      note: r.data.note,
    };
  }

  function checkFields(def: FormDefinition, purpose: "report" | "desk" | "public"): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const c of builderChecks(def, { purpose })) {
      if (c.ok || c.level !== "error") continue;
      const msg = CHECK_MESSAGES[c.key] ?? "Fix this before publishing.";
      for (const id of c.fieldIds) fields[id] = msg;
      if (c.detail.length) fields[c.key] = `${msg} ${c.detail.slice(0, 3).join("; ")}`;
      else if (c.fieldIds.length === 0) fields[c.key] = msg;
    }
    return fields;
  }

  function normaliseDraft(def: FormDefinition, base: { id: string; templateId: string; version: number; sevaType: SevaType }): FormDefinition {
    return { ...def, id: base.id, templateId: base.templateId, version: base.version, sevaType: base.sevaType };
  }

  async function assertEditable(actor: Actor) {
    assertCan(actor, "forms.manage");
  }

  async function newTemplate(actor: Actor, title: FormDefinition["title"], sevaType: SevaType | null, purpose: TemplateRec["purpose"], source: FormDefinition | null) {
    const templateId = newId();
    const versionId = newId();
    const def = source
      ? normaliseDraft({ ...structuredClone(source), title }, { id: versionId, templateId, version: 1, sevaType: sevaType ?? source.sevaType })
      : blankDefinition({ id: versionId, templateId }, 1, title, sevaType, purpose);
    const tpl: TemplateRec = { id: templateId, code: `${slug(title.en)}_${templateId.slice(-4).toLowerCase()}`, sevaType, purpose, titleEn: title.en, titleHi: title.hi ?? null, active: true };
    const res = await repo.links.insertTemplate(tpl, { id: versionId, templateId, version: 1, status: "draft", definition: def, publishedAt: null, rev: 1 }, actor.userId);
    if (res === "duplicate") throw new ApiError("CONFLICT");
    await repo.portal.insertAudit(auditRec(actor, { action: "form.create", entity: "form_template", entityId: templateId, data: { title: title.en, copied: !!source } }));
    return tpl;
  }

  return {
    async list(actor) {
      assertCan(actor, "forms.read");
      const [templates, org] = await Promise.all([repo.links.templates(), loadOrg(repo)]);
      const edit = manage(actor);
      const rows: FormTemplateRow[] = [];
      for (const tpl of templates) rows.push(await row(tpl, await repo.links.versionsOf(tpl.id), org, edit));
      const titles = new Map(templates.map((x) => [x.id, x]));
      const reqs = (await repo.m6.docList<ChangeRequestData>("form_change_request")).filter((r) => edit || r.data.byId === actor.userId || (r.data.fromId && actor.unitIds.has(r.data.fromId)));
      return {
        templates: rows,
        changeRequests: await Promise.all(reqs.map((r) => requestRow(r, org, titles))),
        can: { build: edit, requestChange: !edit },
      };
    },

    async create(actor, body) {
      await assertEditable(actor);
      let source: FormDefinition | null = null;
      if (body.fromTemplateId) {
        await templateOr404(body.fromTemplateId);
        const { published, draft } = split(await repo.links.versionsOf(body.fromTemplateId));
        source = (published ?? draft)?.definition ?? null;
      }
      const tpl = await newTemplate(actor, { en: body.title.en, hi: body.title.hi ?? null }, body.sevaType, body.purpose ?? "report", source);
      return toDetail(actor, tpl);
    },

    async detail(actor, id) {
      assertCan(actor, "forms.read");
      return toDetail(actor, await templateOr404(id));
    },

    async patchDraft(actor, id, body) {
      await assertEditable(actor);
      const tpl = await templateOr404(id);
      const versions = await repo.links.versionsOf(id);
      const { published, draft } = split(versions);
      const dups = duplicateIds(body.definition);
      const missing = lockedProblems(published?.definition ?? draft?.definition ?? null, body.definition);
      if (dups.length || missing.length) {
        const fields: Record<string, string> = {};
        for (const d of dups) fields[d] = "Another question already uses this name.";
        for (const m of missing) fields[m] = "This core question cannot be removed or unlocked.";
        throw new ApiError("VALIDATION_FAILED", { fields });
      }
      if (body.version === null) {
        if (draft) throw new ApiError("CONFLICT", { message: "A draft already exists. Reload the page." });
        const version = (versions.reduce((m, v) => Math.max(m, v.version), 0) || 0) + 1;
        const versionId = newId();
        const def = normaliseDraft(body.definition, { id: versionId, templateId: id, version, sevaType: published?.definition.sevaType ?? body.definition.sevaType });
        const res = await repo.links.insertVersion({ id: versionId, templateId: id, version, status: "draft", definition: def, publishedAt: null, rev: 1 }, actor.userId);
        if (res === "duplicate") throw new ApiError("CONFLICT");
      } else {
        if (!draft) throw new ApiError("CONFLICT", { message: "This draft was published. Reload the page." });
        const def = normaliseDraft(body.definition, { id: draft.id, templateId: id, version: draft.version, sevaType: draft.definition.sevaType });
        const res = await repo.links.updateDraft(draft.id, def, body.version);
        if (res === "conflict") throw new ApiError("CONFLICT");
      }
      await repo.portal.insertAudit(auditRec(actor, { action: "form.draft", entity: "form_template", entityId: id, data: { fields: fieldCount(body.definition) } }));
      return toDetail(actor, tpl);
    },

    async publish(actor, id, version) {
      await assertEditable(actor);
      const tpl = await templateOr404(id);
      const { published, draft } = split(await repo.links.versionsOf(id));
      if (!draft) throw new ApiError("CONFLICT", { message: "There is no draft to publish." });
      if ((draft.rev ?? 1) !== version) throw new ApiError("CONFLICT");
      const fields = checkFields(draft.definition, tpl.purpose);
      const locked = lockedProblems(published?.definition ?? null, draft.definition);
      for (const m of locked) fields[m] = "This core question cannot be removed or unlocked.";
      if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
      const res = await repo.links.publishDraft(draft.id, version, now(), actor.userId);
      if (res === "conflict") throw new ApiError("CONFLICT");
      await repo.portal.insertAudit(auditRec(actor, { action: "form.publish", entity: "form_template", entityId: id, data: { version: draft.version } }));
      return toDetail(actor, tpl);
    },

    async duplicate(actor, id, body) {
      await assertEditable(actor);
      const src = await templateOr404(id);
      const { published, draft } = split(await repo.links.versionsOf(id));
      const def = (published ?? draft)?.definition ?? null;
      const tpl = await newTemplate(actor, { en: body.title.en, hi: body.title.hi ?? null }, body.sevaType === undefined ? src.sevaType : body.sevaType, src.purpose, def);
      return toDetail(actor, tpl);
    },

    async test(actor, id, body) {
      assertCan(actor, "forms.read");
      await templateOr404(id);
      const { published, draft } = split(await repo.links.versionsOf(id));
      const def = (manage(actor) ? (draft ?? published) : published)?.definition;
      if (!def) throw new ApiError("NOT_FOUND");
      const locale: Locale = body.locale ?? "en";
      const result = validateAnswers(def, body.answers);
      return {
        ok: result.ok,
        errors: issuesToFieldMap(result.errors, locale),
        warnings: issuesToFieldMap(result.warnings, locale),
        kpis: kpiFactsFromAnswers(def, result.clean).map((f) => ({ key: f.key, dim: f.dim, value: f.value })),
      };
    },

    async versions(actor, id) {
      assertCan(actor, "forms.read");
      return (await toDetail(actor, await templateOr404(id))).versions;
    },

    async versionDefinition(actor, id, version) {
      assertCan(actor, "forms.read");
      await templateOr404(id);
      const v = (await repo.links.versionsOf(id)).find((x) => x.version === version);
      if (!v || (v.status === "draft" && !manage(actor))) throw new ApiError("NOT_FOUND");
      return v.definition;
    },

    async templateXlsx(actor, id, q) {
      assertCan(actor, "forms.read");
      const tpl = await templateOr404(id);
      const versions = await repo.links.versionsOf(id);
      const v = q.version ? versions.find((x) => x.version === q.version && (x.status === "published" || manage(actor))) : split(versions).published;
      if (!v) throw new ApiError("NOT_FOUND");
      let code: string | null = null;
      if (q.samithi) {
        const org = await loadOrg(repo);
        const unit = org.get(q.samithi);
        if (!unit || unit.kind !== "samithi" || !(actor.all || actor.unitIds.has(unit.id))) throw new ApiError("NOT_FOUND");
        code = unit.code;
      }
      return { bytes: await buildTemplateXlsx(v.definition, { samithiCode: code }), filename: `${tpl.code}-v${v.version}.xlsx` };
    },

    async createChangeRequest(actor, id, body) {
      assertCan(actor, "forms.read");
      await templateOr404(id);
      const [org, templates] = await Promise.all([loadOrg(repo), repo.links.templates()]);
      const rid = newId();
      const data: ChangeRequestData = {
        templateId: id,
        fromId: actor.scopeId && org.get(actor.scopeId)?.kind === "district" ? actor.scopeId : null,
        byId: actor.userId,
        by: actor.name,
        text: body.text,
        urgency: body.urgency ?? "no_rush",
        status: "open",
        decidedAt: null,
        note: null,
      };
      await repo.m6.docInsert("form_change_request", { id: rid, k1: id, k2: "open", data }, [auditRec(actor, { action: "form.change_request", entity: "form_template", entityId: id, data: { urgency: data.urgency } })]);
      const rec = await repo.m6.docGet<ChangeRequestData>("form_change_request", rid);
      if (!rec) throw new ApiError("INTERNAL");
      return requestRow(rec, org, new Map(templates.map((x) => [x.id, x])));
    },

    async decideChangeRequest(actor, requestId, body) {
      await assertEditable(actor);
      const rec = await repo.m6.docGet<ChangeRequestData>("form_change_request", requestId);
      if (!rec) throw new ApiError("NOT_FOUND");
      if (rec.data.status !== "open") throw new ApiError("CONFLICT", { message: "This request was already handled." });
      const data: ChangeRequestData = { ...rec.data, status: body.status, decidedAt: toIso(now()), note: body.note ?? null };
      const res = await repo.m6.docUpdate("form_change_request", { id: requestId, k1: data.templateId, k2: body.status, data }, rec.version, [
        auditRec(actor, { action: `form.change_request.${body.status}`, entity: "form_template", entityId: data.templateId }),
      ]);
      if (!res.ok) throw new ApiError("CONFLICT");
      const [org, templates] = await Promise.all([loadOrg(repo), repo.links.templates()]);
      const next = await repo.m6.docGet<ChangeRequestData>("form_change_request", requestId);
      if (!next) throw new ApiError("INTERNAL");
      return requestRow(next, org, new Map(templates.map((x) => [x.id, x])));
    },
  };
}

export type { FormField };
