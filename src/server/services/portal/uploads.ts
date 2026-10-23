// Excel/CSV report uploads (spec 33): parse + validate against the report form,
// preview with plain-language issues, confirm into events + submissions awaiting
// district approval, history, marked-up error file, and "use your own file" → inbox.
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import {
  type AnswerMap,
  type FormDefinition,
  type FormField,
  type FormIssue,
  type I18nText,
  type Locale,
  type Paged,
  type SevaType,
  type UploadBatch,
  type UploadCounts,
  type UploadForm,
  type UploadIssue,
  type UploadOptions,
  type UploadPreview,
  type UploadPreviewRow,
  type UploadRejectReason,
  type UploadRowAction,
  type UploadStatus,
  type UploadsQuery,
  type UploadToInboxForm,
  type UploadToInboxResult,
  UPLOAD_LIMITS,
  excelColumns,
  kpiFactsFromAnswers,
  splitPersonal,
  validateAnswers,
} from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { addDays, istDate, istDayStart, istInstant, toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { FormVersionRec, SubmissionRec } from "../../repo/links-types";
import type { InboxItemRec } from "../../repo/wa-types";
import { hmacHex } from "../../security/crypto";
import { type ParsedSheet, type SheetCell, SheetError, readSheet } from "../../xlsx/sheet";
import { buildTemplateXlsx } from "../../xlsx/template";
import { sniffSheet } from "../../xlsx/sniff";
import { i18n, type OrgIndex } from "../org-index";
import { type PortalCtx, loadOrg } from "./shared";

export interface UploadFile {
  name: string;
  bytes: Uint8Array;
}

export interface UploadsService {
  options(actor: Actor): Promise<UploadOptions>;
  template(actor: Actor, q: { sevaType: SevaType; samithi?: string }): Promise<{ bytes: Uint8Array; filename: string }>;
  create(actor: Actor, file: UploadFile, form: UploadForm): Promise<UploadPreview>;
  confirm(actor: Actor, id: string, version: number): Promise<UploadBatch>;
  list(actor: Actor, q: UploadsQuery): Promise<Paged<UploadBatch>>;
  get(actor: Actor, id: string): Promise<UploadPreview>;
  errorsXlsx(actor: Actor, id: string): Promise<{ bytes: Uint8Array; filename: string }>;
  original(actor: Actor, id: string): Promise<{ bytes: Uint8Array; filename: string; mime: string }>;
  toInbox(actor: Actor, file: UploadFile, form: UploadToInboxForm): Promise<UploadToInboxResult>;
}

interface BatchData {
  fileName: string;
  sevaType: SevaType;
  templateId: string;
  templateVersion: number;
  formVersionId: string;
  samithiId: string | null;
  uploadedById: string;
  uploadedBy: string;
  uploadedAt: string;
  loadedAt: string | null;
  status: UploadStatus;
  counts: UploadCounts;
  sha256: string;
  filePath: string | null;
  ext: ".xlsx" | ".csv";
  headers: string[];
  sameAs: { id: string; loadedAt: string } | null;
}

interface RowData {
  batchId: string;
  row: number;
  cells: Record<string, string>;
  action: UploadRowAction;
  issues: UploadIssue[];
  rowKey: string | null;
  samithiId: string | null;
  date: string | null;
  venue: string | null;
  answers: AnswerMap | null;
  existingEventId: string | null;
  existingSubmissionId: string | null;
  /** Set at confirm: what actually happened to the row. */
  loaded: "new" | "updated" | "failed" | null;
}

const ZERO: UploadCounts = { rows: 0, ok: 0, warnings: 0, errors: 0, new: 0, updated: 0, unchanged: 0, rejected: 0 };
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_PREVIEW_ROWS = 200;

const T = {
  wrongTemplate: { en: "This file doesn't match the form for this seva type. Download the template again and copy your numbers into it.", hi: "यह फ़ाइल इस सेवा के फ़ॉर्म से मेल नहीं खाती। टेम्पलेट दोबारा डाउनलोड करें और अपनी संख्याएँ उसमें डालें।" },
  unknownSamithi: { en: "We don't know this samithi code. Use the code from the template.", hi: "यह समिति कोड हमारे पास नहीं है। टेम्पलेट वाला कोड लिखें।" },
  otherSamithi: { en: "This row is for a different samithi than the one you chose.", hi: "यह पंक्ति आपके चुने हुए समिति से अलग समिति की है।" },
  outOfScope: { en: "You can't report for this samithi.", hi: "आप इस समिति के लिए रिपोर्ट नहीं भेज सकते।" },
  badDate: { en: "The date isn't a valid date. Write it as dd/mm/yyyy.", hi: "तारीख़ मान्य नहीं है। इसे dd/mm/yyyy में लिखें।" },
  futureDate: { en: "This date is in the future. Only camps that have already happened can be loaded.", hi: "यह तारीख़ आने वाले दिनों की है। केवल हो चुके शिविर ही लोड हो सकते हैं।" },
  dupInFile: { en: "This camp appears twice in the file (same samithi and date).", hi: "यह शिविर फ़ाइल में दो बार है (वही समिति और तारीख़)।" },
  approved: { en: "This camp already has an approved report, so it was left as it is.", hi: "इस शिविर की रिपोर्ट पहले ही स्वीकृत हो चुकी है, इसलिए इसे वैसा ही रखा गया।" },
  otherWay: { en: "A report for this camp was already sent another way, so it was left as it is.", hi: "इस शिविर की रिपोर्ट पहले किसी और तरीके से भेजी जा चुकी है, इसलिए इसे वैसा ही रखा गया।" },
  notReady: { en: "A camp already exists on this date but isn't ready for a report yet.", hi: "इस तारीख़ पर शिविर पहले से है, पर अभी रिपोर्ट के लिए तैयार नहीं है।" },
  unreadable: { en: "We couldn't open this file. Save it as .xlsx or .csv and try again.", hi: "हम यह फ़ाइल नहीं खोल सके। इसे .xlsx या .csv में सहेजकर फिर कोशिश करें।" },
  failedLoad: { en: "This row could not be loaded. Please check it and upload again.", hi: "यह पंक्ति लोड नहीं हो सकी। इसे जाँचकर दोबारा अपलोड करें।" },
} satisfies Record<string, I18nText>;

const q = (l: I18nText | undefined, fallback: string) => ({ en: l?.en || fallback, hi: l?.hi || l?.en || fallback });

function issueText(code: FormIssue["code"], label: I18nText | undefined, fallback: string, max?: number): I18nText {
  const l = q(label, fallback);
  switch (code) {
    case "required":
      return { en: `"${l.en}" is empty. Please fill it in.`, hi: `"${l.hi}" खाली है। कृपया भरें।` };
    case "max":
    case "warn_above":
      return {
        en: `"${l.en}" is higher than expected${max !== undefined && code === "max" ? ` (the most allowed is ${max})` : ""}. Please check it.`,
        hi: `"${l.hi}" अपेक्षा से अधिक है${max !== undefined && code === "max" ? ` (अधिकतम ${max} हो सकता है)` : ""}। कृपया जाँच लें।`,
      };
    default:
      return { en: `"${l.en}" doesn't look right. Please check it.`, hi: `"${l.hi}" सही नहीं लगता। कृपया जाँच लें।` };
  }
}

const reasonOf = (code: FormIssue["code"]): UploadRejectReason =>
  code === "required" ? "missing_value" : code === "max" || code === "warn_above" ? "number_too_high" : code === "cross" ? "rule_failed" : "other";

function fieldOf(def: FormDefinition, id: string): FormField | undefined {
  for (const s of def.sections) for (const f of s.fields) if (f.id === id) return f;
  return undefined;
}

/** dd/mm/yyyy, d-m-yyyy, yyyy-mm-dd, Excel serial or real date → 'YYYY-MM-DD' (null when not a real date). */
export function parseSheetDate(c: SheetCell): string | null {
  const check = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100
      ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      : null;
  };
  if (c.date) return check(c.date.getUTCFullYear(), c.date.getUTCMonth() + 1, c.date.getUTCDate());
  if (c.num !== null && c.num > 20000 && c.num < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(c.num) * 86_400_000);
    return check(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const t = c.text.trim();
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
  if (m) return check(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return check(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

function coerceCell(f: FormField, c: SheetCell | undefined): unknown {
  if (!c || c.text === "") return null;
  switch (f.kind) {
    case "number":
      return c.num !== null ? (Number.isInteger(c.num) ? c.num : c.text) : c.text.replace(/[,\s]/g, "");
    case "yesno": {
      const v = c.text.toLowerCase();
      if (["yes", "y", "true", "1", "हाँ", "हां"].includes(v)) return "yes";
      if (["no", "n", "false", "0", "नहीं"].includes(v)) return "no";
      return c.text;
    }
    case "select": {
      const v = c.text.toLowerCase();
      const hit = (f.options ?? []).find((o) => o.value.toLowerCase() === v || o.label.en.toLowerCase() === v || (o.label.hi ?? "").toLowerCase() === v);
      return hit ? hit.value : c.text;
    }
    case "multiselect":
      return c.text
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (f.options ?? []).find((o) => o.value.toLowerCase() === s.toLowerCase() || o.label.en.toLowerCase() === s.toLowerCase())?.value ?? s);
    case "date":
      return parseSheetDate(c) ?? c.text;
    default:
      return c.text;
  }
}

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const slugName = (s: string) => s.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";

export function createUploadsService(ctx: PortalCtx): UploadsService {
  const { repo, deps } = ctx;
  const now = () => deps.now();

  async function reportTemplate(sevaType: SevaType) {
    const [all, types] = await Promise.all([repo.links.templates(), repo.sevaTypes()]);
    const pinned = types.find((s) => s.code === sevaType)?.templateId;
    const active = all.filter((x) => x.active && x.purpose === "report");
    return active.find((x) => x.id === pinned) ?? active.find((x) => x.sevaType === sevaType) ?? null;
  }

  async function templateVersion(sevaType: SevaType): Promise<{ tpl: NonNullable<Awaited<ReturnType<typeof reportTemplate>>>; version: FormVersionRec }> {
    const tpl = await reportTemplate(sevaType);
    const version = tpl ? await repo.links.publishedVersion(tpl.id) : null;
    if (!tpl || !version) throw new ApiError("VALIDATION_FAILED", { fields: { sevaType: "There is no report form for this seva type yet." } });
    return { tpl, version };
  }

  const inScope = (actor: Actor, unitId: string | null) => actor.all || (!!unitId && actor.unitIds.has(unitId));

  function visible(actor: Actor, b: { data: BatchData }) {
    return actor.all || b.data.uploadedById === actor.userId || inScope(actor, b.data.samithiId);
  }

  async function batchOr404(actor: Actor, id: string) {
    const b = await repo.m6.docGet<BatchData>("upload_batch", id);
    if (!b || !visible(actor, b)) throw new ApiError("NOT_FOUND");
    return b;
  }

  async function toBatch(b: { id: string; version: number; data: BatchData }, org: OrgIndex, titles: Map<string, I18nText>): Promise<UploadBatch> {
    const d = b.data;
    return {
      id: b.id,
      fileName: d.fileName,
      sevaType: d.sevaType,
      template: { id: d.templateId, version: d.templateVersion, title: titles.get(d.templateId) ?? { en: "Report form", hi: null } },
      samithi: d.samithiId ? org.ref(d.samithiId) : null,
      uploadedBy: d.uploadedBy,
      uploadedAt: d.uploadedAt,
      loadedAt: d.loadedAt,
      status: d.status,
      counts: d.counts,
      version: b.version,
    };
  }

  async function titlesMap() {
    return new Map((await repo.links.templates()).map((t) => [t.id, i18n(t.titleEn, t.titleHi)]));
  }

  async function previewOf(b: { id: string; version: number; data: BatchData }, org: OrgIndex): Promise<UploadPreview> {
    const [rows, version, titles] = await Promise.all([repo.m6.docList<RowData>("upload_row", { k1: b.id, order: "asc" }), repo.links.versionById(b.data.formVersionId), titlesMap()]);
    const all = rows.map((r) => r.data).sort((a, c) => a.row - c.row);
    const withIssues = all.filter((r) => r.issues.length > 0).slice(0, MAX_PREVIEW_ROWS);
    const clean = all.filter((r) => r.issues.length === 0).slice(0, Math.max(0, Math.min(5, MAX_PREVIEW_ROWS - withIssues.length)));
    const rowDto = (r: RowData): UploadPreviewRow => ({ row: r.row, cells: r.cells, action: r.action, issues: r.issues });
    return {
      ...(await toBatch(b, org, titles)),
      columns: version ? excelColumns(version.definition) : [],
      rows: [...withIssues, ...clean].map(rowDto),
      sameAs: b.data.sameAs,
    };
  }

  function countsOf(rows: readonly RowData[]): UploadCounts {
    const c: UploadCounts = { ...ZERO, rows: rows.length };
    for (const r of rows) {
      const hasError = r.issues.some((i) => i.level === "error");
      const hasWarn = r.issues.some((i) => i.level === "warn");
      if (hasError) c.errors++;
      else if (hasWarn) c.warnings++;
      else c.ok++;
      if (r.action === "new") c.new++;
      else if (r.action === "update") c.updated++;
      else if (r.action === "same") c.unchanged++;
      else c.rejected++;
    }
    return c;
  }

  async function findExisting(samithiId: string, sevaType: SevaType, date: string) {
    const res = await repo.portal.listAdminEvents({
      samithiId,
      sevaType,
      from: istDayStart(date),
      to: istDayStart(addDays(date, 1)),
      sort: "startsAt",
      limit: 20,
      offset: 0,
    });
    return res.rows.filter((e) => e.status !== "cancelled");
  }

  async function parseRows(actor: Actor, sheet: ParsedSheet, form: UploadForm, def: FormDefinition, batchId: string): Promise<RowData[]> {
    const org = await loadOrg(repo);
    const columns = excelColumns(def);
    const byCode = new Map(org.districts().flatMap((d) => org.samithisOf(d.id)).map((u) => [u.code.toLowerCase(), u]));
    for (const u of [...(await repo.orgUnits())]) if (u.kind === "samithi" && !byCode.has(u.code.toLowerCase())) byCode.set(u.code.toLowerCase(), u);
    const chosen = form.samithi ? org.get(form.samithi) : undefined;
    const today = istDate(now());
    const seen = new Set<string>();
    const out: RowData[] = [];

    for (const r of sheet.rows) {
      const cells: Record<string, string> = {};
      for (const [h, c] of r.cells) cells[h] = c.text;
      const issues: UploadIssue[] = [];
      const add = (level: "error" | "warn", reason: UploadRejectReason, column: string | null, message: I18nText) => issues.push({ row: r.row, column, level, reason, message });
      const data: RowData = { batchId, row: r.row, cells, action: "new", issues, rowKey: null, samithiId: null, date: null, venue: null, answers: null, existingEventId: null, existingSubmissionId: null, loaded: null };

      // Samithi
      const codeText = (r.cells.get("samithi_code")?.text ?? "").trim();
      let unit = codeText ? byCode.get(codeText.toLowerCase()) : chosen;
      if (!unit || unit.kind !== "samithi") {
        add("error", "unknown_samithi", "samithi_code", T.unknownSamithi);
        unit = undefined;
      } else if (chosen && unit.id !== chosen.id) {
        add("error", "out_of_scope", "samithi_code", T.otherSamithi);
      } else if (!inScope(actor, unit.id)) {
        add("error", "out_of_scope", "samithi_code", T.outOfScope);
      }
      data.samithiId = unit?.id ?? null;

      // Date
      const dateCell = r.cells.get("date");
      const date = dateCell ? parseSheetDate(dateCell) : null;
      if (!date) add("error", "bad_date", "date", T.badDate);
      else if (date > today) add("error", "future_date", "date", T.futureDate);
      data.date = date;

      // Answers + form rules
      const answers: AnswerMap = {};
      for (const col of columns) {
        const f = fieldOf(def, col.fieldId);
        if (!f) continue;
        if (col.fieldId === "samithi") answers.samithi = unit ? org.ref(unit.id).name.en : null;
        else if (col.fieldId === "date") answers.date = date;
        else answers[col.fieldId] = coerceCell(f, r.cells.get(col.header));
      }
      const v = validateAnswers(def, answers);
      const header = (path: string) => (path.split(".")[0] === "samithi" ? "samithi_code" : path.split(".")[0]);
      for (const [list, level] of [[v.errors, "error"], [v.warnings, "warn"]] as const) {
        for (const i of list) {
          if (i.path === "date" && !date) continue; // already reported
          if (i.path === "samithi") continue;
          const f = fieldOf(def, i.path.split(".")[0]);
          const message = i.code === "cross" ? { en: i.message.en, hi: i.message.hi ?? i.message.en } : issueText(i.code, f?.label, i.path, f?.max ?? undefined);
          add(level, reasonOf(i.code), header(i.path), message);
        }
      }
      data.venue = typeof v.clean.venue === "string" ? v.clean.venue : (r.cells.get("venue")?.text ?? null);
      data.answers = v.clean;

      // Identity: samithi + date + seva type
      if (unit && date) {
        data.rowKey = `${unit.id}|${date}|${form.sevaType}`;
        if (seen.has(data.rowKey)) add("error", "duplicate_row", null, T.dupInFile);
        seen.add(data.rowKey);
      }

      const hasError = issues.some((i) => i.level === "error");
      if (!hasError && unit && date) {
        const existing = await findExisting(unit.id, form.sevaType, date);
        if (existing.some((e) => e.status === "approved")) add("error", "duplicate_row", null, T.approved);
        else if (existing.length > 0) {
          const ev = existing[0];
          data.existingEventId = ev.id;
          if (ev.status === "planned" || ev.status === "awaiting_report") data.action = "update";
          else if (ev.status === "report_submitted" || ev.status === "escalated") {
            const subs = (await repo.portal.submissionsForEvent(ev.id)).filter((s) => s.status === "submitted" || s.status === "approved");
            const latest = subs.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];
            if (!latest || latest.source !== "upload") add("error", "duplicate_row", null, T.otherWay);
            else {
              data.existingSubmissionId = latest.id;
              const same = JSON.stringify(sortKeys(latest.answers)) === JSON.stringify(sortKeys(splitPersonal(def, v.clean).answers));
              data.action = same ? "same" : "update";
            }
          } else add("error", "duplicate_row", null, T.notReady);
        }
      }
      if (issues.some((i) => i.level === "error")) data.action = "reject";
      out.push(data);
    }
    return out;
  }

  const sortKeys = (o: AnswerMap): AnswerMap => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

  async function saveBatch(actor: Actor, file: UploadFile, ext: ".xlsx" | ".csv", form: UploadForm, tpl: { id: string }, version: FormVersionRec, status: UploadStatus, rows: RowData[], headers: string[], sameAs: BatchData["sameAs"], batchId: string, hash: string) {
    const at = now();
    const counts = status === "no_changes" ? { ...ZERO } : countsOf(rows);
    const path = `uploads/${batchId}/original${ext}`;
    await deps.storage.put(path, file.bytes);
    const data: BatchData = {
      fileName: slugName(file.name),
      sevaType: form.sevaType,
      templateId: tpl.id,
      templateVersion: version.version,
      formVersionId: version.id,
      samithiId: form.samithi ?? null,
      uploadedById: actor.userId,
      uploadedBy: actor.name,
      uploadedAt: toIso(at),
      loadedAt: null,
      status,
      counts,
      sha256: hash,
      filePath: path,
      ext,
      headers,
      sameAs,
    };
    await repo.m6.docInsert("upload_batch", { id: batchId, k1: form.samithi ?? "", k2: hash, data }, [
      auditRec(actor, { action: "upload.create", entity: "upload_batch", entityId: batchId, scopeId: form.samithi ?? actor.scopeId, data: { sevaType: form.sevaType, status, counts } }),
    ]);
    for (const r of rows) await repo.m6.docInsert("upload_row", { id: `${batchId}:${r.row}`, k1: batchId, k2: r.rowKey, data: r });
  }

  return {
    async options(actor) {
      assertCan(actor, "uploads.manage");
      const [org, types] = await Promise.all([loadOrg(repo), repo.sevaTypes()]);
      const sevaTypes: UploadOptions["sevaTypes"] = [];
      for (const s of [...types].filter((x) => x.active).sort((a, b) => a.sortOrder - b.sortOrder)) {
        const tpl = await reportTemplate(s.code);
        const v = tpl ? await repo.links.publishedVersion(tpl.id) : null;
        if (tpl && v) sevaTypes.push({ sevaType: s.code, label: i18n(s.labelEn, s.labelHi), icon: s.icon, templateId: tpl.id, version: v.version, title: i18n(tpl.titleEn, tpl.titleHi) });
      }
      const samithis = (await repo.orgUnits())
        .filter((u) => u.kind === "samithi" && u.active && inScope(actor, u.id))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        .map((u) => ({ ...org.ref(u.id), code: u.code }));
      return { sevaTypes, samithis };
    },

    async template(actor, qy) {
      assertCan(actor, "uploads.manage");
      const { tpl, version } = await templateVersion(qy.sevaType);
      let code: string | null = null;
      if (qy.samithi) {
        const unit = (await repo.orgUnits()).find((u) => u.id === qy.samithi);
        if (!unit || unit.kind !== "samithi" || !inScope(actor, unit.id)) throw new ApiError("NOT_FOUND");
        code = unit.code;
      }
      return { bytes: await buildTemplateXlsx(version.definition, { samithiCode: code }), filename: `${tpl.code}-v${version.version}.xlsx` };
    },

    async create(actor, file, form) {
      assertCan(actor, "uploads.manage");
      const field = (message: string) => new ApiError("VALIDATION_FAILED", { fields: { file: message } });
      const kind = sniffSheet(file.bytes, file.name);
      if (!kind) throw field("Upload an .xlsx or .csv file.");
      if (file.bytes.byteLength > UPLOAD_LIMITS.sheetBytes) throw field("The file is larger than 5 MB.");
      if (form.samithi) {
        const u = (await repo.orgUnits()).find((x) => x.id === form.samithi);
        if (!u || u.kind !== "samithi" || !inScope(actor, u.id)) throw new ApiError("NOT_FOUND");
      }
      const { tpl, version } = await templateVersion(form.sevaType);
      const def = version.definition;
      const hash = sha256(file.bytes);
      const batchId = newId();
      const org = await loadOrg(repo);

      // Same file already loaded → nothing to do.
      const prior = (await repo.m6.docList<BatchData>("upload_batch", { k2: hash })).find((b) => b.data.status === "loaded" && b.data.sevaType === form.sevaType);
      if (prior) {
        await saveBatch(actor, file, kind, form, tpl, version, "no_changes", [], [], { id: prior.id, loadedAt: prior.data.loadedAt ?? prior.data.uploadedAt }, batchId, hash);
        return previewOf((await repo.m6.docGet<BatchData>("upload_batch", batchId))!, org);
      }

      let sheet: ParsedSheet;
      try {
        sheet = await readSheet(file.bytes, kind, UPLOAD_LIMITS.maxRows);
      } catch (err) {
        if (err instanceof SheetError && err.message === "too_many_rows") throw field(`The file has more than ${UPLOAD_LIMITS.maxRows} rows. Split it into smaller files.`);
        const issue: UploadIssue = { row: 1, column: null, level: "error", reason: "wrong_template", message: T.unreadable };
        const row: RowData = { batchId, row: 1, cells: {}, action: "reject", issues: [issue], rowKey: null, samithiId: null, date: null, venue: null, answers: null, existingEventId: null, existingSubmissionId: null, loaded: null };
        await saveBatch(actor, file, kind, form, tpl, version, "failed", [row], [], null, batchId, hash);
        return previewOf((await repo.m6.docGet<BatchData>("upload_batch", batchId))!, org);
      }

      const expected = excelColumns(def).map((c) => c.header);
      const matched = expected.filter((h) => sheet.headers.includes(h)).length;
      if (!sheet.headers.includes("date") || matched < Math.min(5, expected.length)) {
        const issue: UploadIssue = { row: 1, column: null, level: "error", reason: "wrong_template", message: T.wrongTemplate };
        const row: RowData = { batchId, row: 1, cells: {}, action: "reject", issues: [issue], rowKey: null, samithiId: null, date: null, venue: null, answers: null, existingEventId: null, existingSubmissionId: null, loaded: null };
        await saveBatch(actor, file, kind, form, tpl, version, "failed", [row], sheet.headers, null, batchId, hash);
        return previewOf((await repo.m6.docGet<BatchData>("upload_batch", batchId))!, org);
      }

      const rows = await parseRows(actor, sheet, form, def, batchId);
      await saveBatch(actor, file, kind, form, tpl, version, rows.length === 0 ? "failed" : "preview", rows, sheet.headers, null, batchId, hash);
      return previewOf((await repo.m6.docGet<BatchData>("upload_batch", batchId))!, org);
    },

    async confirm(actor, id, expectVersion) {
      assertCan(actor, "uploads.manage");
      const b = await batchOr404(actor, id);
      if (b.data.status !== "preview" || b.version !== expectVersion) throw new ApiError("CONFLICT", { message: b.data.status === "loaded" ? "This file was already loaded." : undefined });
      const org = await loadOrg(repo);
      const version = await repo.links.versionById(b.data.formVersionId);
      if (!version) throw new ApiError("NOT_FOUND");
      const def = version.definition;
      const rows = (await repo.m6.docList<RowData>("upload_row", { k1: id, order: "asc" })).sort((a, c) => a.data.row - c.data.row);
      const at = now();
      const locale: Locale = "en";
      const sevaLabel = org.sevaType(b.data.sevaType).label;
      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const r of rows) {
        const d = r.data;
        if (d.action === "reject" || d.action === "same" || !d.samithiId || !d.date || !d.answers) continue;
        try {
          // The row may have changed since the preview (someone approved it meanwhile).
          const existing = await findExisting(d.samithiId, b.data.sevaType, d.date);
          if (existing.some((e) => e.status === "approved")) throw new Error("approved");
          let eventId = d.existingEventId ?? existing[0]?.id ?? null;

          if (!eventId) {
            const samithi = org.get(d.samithiId);
            if (!samithi) throw new Error("samithi");
            eventId = newId();
            const startsAt = istInstant(d.date, "10:00");
            const titleHi = sevaLabel.hi && samithi.nameHi ? `${sevaLabel.hi} — ${samithi.nameHi}` : null;
            await repo.portal.insertEvent({
              event: {
                id: eventId,
                sevaType: b.data.sevaType,
                status: "awaiting_report",
                titleEn: `${sevaLabel.en} at ${samithi.nameEn}`,
                titleHi,
                descriptionEn: null,
                descriptionHi: null,
                startsAt,
                endsAt: null,
                postponedTo: null,
                venueName: d.venue ?? "—",
                venueAddress: d.venue ?? "—",
                venueLat: null,
                venueLng: null,
                samithiId: samithi.id,
                districtId: org.districtIdOf(samithi.id) ?? samithi.parentId ?? samithi.id,
                centreId: null,
                partnerId: null,
                volunteersNeeded: null,
                volunteersJoined: 0,
                bring: [],
                resultsPhotos: [],
                recurring: false,
                source: "upload",
                createdBy: actor.userId,
                reportDueAt: null,
                approvedAt: null,
                approvalRequestedAt: null,
                escalatedAt: null,
                escalatedFrom: null,
                selfApproved: false,
                version: 1,
                updatedAt: at,
              },
              timeline: [{ status: "awaiting_report", at, byRole: actor.role, byLabel: actor.name, byUserId: actor.userId, channel: "portal", note: "Created from a spreadsheet upload" }],
              approval: null,
              audit: [auditRec(actor, { action: "event.create", entity: "event", entityId: eventId, scopeId: samithi.id, data: { source: "upload", batch: id } })],
            });
            await repo.links.lockEventFormVersion(eventId, version.id);
            await ctx.links.submitExternal({ eventId, answers: d.answers, source: "upload", byLabel: actor.name, byHash: null, byMasked: actor.name, locale, idempotencyKey: `${id}:${d.row}` });
            created++;
            d.loaded = "new";
          } else if (d.existingSubmissionId) {
            const sub = await repo.links.submissionById(d.existingSubmissionId);
            if (!sub || sub.status === "approved") throw new Error("gone");
            const { answers } = splitPersonal(def, d.answers);
            const res = await repo.links.updateSubmission({
              id: sub.id,
              expectedVersion: sub.version,
              answers,
              personalAnswers: null,
              status: "submitted",
              facts: kpiFactsFromAnswers(def, d.answers).map((f) => ({ kpiKey: f.key, dim: f.dim, value: f.value })),
              consents: [],
              attachmentIds: [],
              eventId,
            });
            if (res === "conflict") throw new Error("conflict");
            updated++;
            d.loaded = "updated";
          } else {
            if (!(await repo.links.eventFormVersionId(eventId))) await repo.links.lockEventFormVersion(eventId, version.id);
            await ctx.links.submitExternal({ eventId, answers: d.answers, source: "upload", byLabel: actor.name, byHash: null, byMasked: actor.name, locale, idempotencyKey: `${id}:${d.row}` });
            updated++;
            d.loaded = "updated";
          }
          d.existingEventId = eventId;
        } catch (err) {
          failed++;
          d.loaded = "failed";
          d.action = "reject";
          d.issues.push({ row: d.row, column: null, level: "error", reason: err instanceof Error && err.message === "approved" ? "duplicate_row" : "other", message: err instanceof Error && err.message === "approved" ? T.approved : T.failedLoad });
        }
        await repo.m6.docUpdate("upload_row", { id: r.id, k1: r.k1, k2: r.k2, data: d }, undefined);
      }

      const counts: UploadCounts = { ...b.data.counts, new: created, updated, rejected: b.data.counts.rejected + failed };
      const data: BatchData = { ...b.data, status: "loaded", loadedAt: toIso(at), counts };
      const res = await repo.m6.docUpdate("upload_batch", { id, k1: b.k1, k2: b.k2, data }, expectVersion, [
        auditRec(actor, { action: "upload.confirm", entity: "upload_batch", entityId: id, scopeId: b.data.samithiId ?? actor.scopeId, data: { created, updated, rejected: counts.rejected } }),
      ]);
      if (!res.ok) throw new ApiError("CONFLICT");
      deps.revalidate(["events", "home"]);
      return toBatch({ id, version: res.version, data }, org, await titlesMap());
    },

    async list(actor, qy) {
      assertCan(actor, "uploads.manage");
      const [org, titles] = await Promise.all([loadOrg(repo), titlesMap()]);
      const rows = (await repo.m6.docList<BatchData>("upload_batch"))
        .filter((b) => visible(actor, b))
        .filter((b) => (!qy.status || b.data.status === qy.status) && (!qy.sevaType || b.data.sevaType === qy.sevaType));
      const page = rows.slice((qy.page - 1) * qy.pageSize, qy.page * qy.pageSize);
      return { data: await Promise.all(page.map((b) => toBatch(b, org, titles))), meta: { page: qy.page, pageSize: qy.pageSize, total: rows.length } };
    },

    async get(actor, id) {
      assertCan(actor, "uploads.manage");
      return previewOf(await batchOr404(actor, id), await loadOrg(repo));
    },

    async errorsXlsx(actor, id) {
      assertCan(actor, "uploads.manage");
      const b = await batchOr404(actor, id);
      const rows = (await repo.m6.docList<RowData>("upload_row", { k1: id, order: "asc" })).map((r) => r.data).sort((a, c) => a.row - c.row);
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 1 }] });
      const headers = b.data.headers;
      headers.forEach((h, i) => {
        const c = ws.getCell(1, i + 1);
        c.value = h;
        c.font = { bold: true };
      });
      const pCol = headers.length + 1;
      ws.getCell(1, pCol).value = "Problems";
      ws.getCell(1, pCol).font = { bold: true };
      ws.getCell(1, pCol + 1).value = "समस्याएँ";
      ws.getCell(1, pCol + 1).font = { bold: true };
      ws.getColumn(pCol).width = 60;
      ws.getColumn(pCol + 1).width = 60;
      const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
      for (const r of rows) {
        headers.forEach((h, i) => (ws.getCell(r.row, i + 1).value = r.cells[h] ?? ""));
        for (const issue of r.issues) {
          const argb = issue.level === "error" ? "FFFFC7CE" : "FFFFEB9C";
          const cols = issue.column && headers.includes(issue.column) ? [headers.indexOf(issue.column) + 1] : headers.map((_, i) => i + 1);
          for (const c of cols) {
            const cell = ws.getCell(r.row, c);
            if (!(cell.fill && "fgColor" in cell.fill && cell.fill.fgColor?.argb === "FFFFC7CE")) cell.fill = fill(argb);
          }
        }
        if (r.issues.length) {
          ws.getCell(r.row, pCol).value = r.issues.map((i) => i.message.en).join(" ");
          ws.getCell(r.row, pCol + 1).value = r.issues.map((i) => i.message.hi ?? i.message.en).join(" ");
        }
      }
      headers.forEach((_, i) => (ws.getColumn(i + 1).width = 18));
      await repo.portal.insertAudit(auditRec(actor, { action: "upload.download_errors", entity: "upload_batch", entityId: id, scopeId: b.data.samithiId }));
      return { bytes: new Uint8Array(await wb.xlsx.writeBuffer()), filename: `${b.data.fileName.replace(/\.[^.]+$/, "")}-problems.xlsx` };
    },

    async original(actor, id) {
      assertCan(actor, "uploads.manage");
      const b = await batchOr404(actor, id);
      const bytes = b.data.filePath ? await deps.storage.get(b.data.filePath) : null;
      if (!bytes) throw new ApiError("NOT_FOUND");
      return { bytes, filename: b.data.fileName, mime: b.data.ext === ".csv" ? "text/csv" : XLSX_MIME };
    },

    async toInbox(actor, file, form) {
      assertCan(actor, "uploads.manage");
      const kind = sniffSheet(file.bytes, file.name);
      if (!kind) throw new ApiError("VALIDATION_FAILED", { fields: { file: "Upload an .xlsx or .csv file." } });
      if (file.bytes.byteLength > UPLOAD_LIMITS.sheetBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: "The file is larger than 5 MB." } });
      const org = await loadOrg(repo);
      const at = now();
      const id = newId();
      const rel = `inbox/${id}${kind}`;
      await deps.storage.put(rel, file.bytes);
      const scopeId = actor.scopeId && org.get(actor.scopeId)?.kind === "samithi" ? actor.scopeId : null;
      const districtId = scopeId ? (org.districtIdOf(scopeId) ?? null) : actor.scopeId && org.get(actor.scopeId)?.kind === "district" ? actor.scopeId : null;
      const item: InboxItemRec = {
        id,
        source: "upload",
        senderHash: hmacHex(deps.secret, "user", actor.userId),
        senderEnc: null,
        senderMasked: actor.name,
        conversationId: null,
        scopeId,
        districtId,
        receivedAt: at,
        state: "for_me",
        outcome: null,
        eventId: null,
        rawKind: "spreadsheet",
        rawText: form.note ?? (form.sevaType ? `Seva type: ${form.sevaType}` : null),
        mediaPath: rel,
        mediaName: slugName(file.name),
        draftAnswers: {},
        fieldConfidence: {},
        confidence: "low",
        aiModel: null,
        aiDraftedAt: null,
        awaitingReply: false,
        version: 1,
        updatedAt: at,
      };
      await repo.wa.insertInbox(item, [{ itemId: id, action: "matched", byRole: actor.role, byLabel: actor.name, byUserId: actor.userId, note: "Uploaded own file", at }]);
      await repo.portal.insertAudit(auditRec(actor, { action: "upload.to_inbox", entity: "inbox_item", entityId: id, scopeId: scopeId ?? districtId }));
      return { inboxItemId: id };
    },
  };
}

export type { SubmissionRec };
void toIsoOrNull;
