// Report totals by chat (spec 50 flow 5): the form's number questions one per
// message with validation, a summary to confirm, then a submission with source
// "whatsapp" that goes to the district like any other report.
import { type AnswerMap, type FormField, validateAnswers } from "@/contract";
import { auditRec } from "../../audit";
import { addDays, istDate, istDayStart } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { loadOrg, scopeSamithiIds } from "../../services/portal/shared";
import { chatQuestions } from "../questions";
import { COPY, LABEL, pick } from "./copy";
import { showMenu } from "./menu";
import { isSkip, parseWholeNumber } from "./parse";
import { buttons, list, resetFlow, say, setStep } from "./reply";
import type { Flow, Turn } from "./types";

interface ReportData {
  eventId?: string;
  answers?: Record<string, number>;
  /** Field ids already answered or skipped. */
  done?: string[];
  photos?: string[];
}

const data = (t: Turn) => t.conv.state.data as ReportData;

const label = (f: FormField, t: Turn) => (t.locale === "hi" ? f.label.hi : null) ?? f.label.en;

async function reportUrl(t: Turn, eventId: string): Promise<string> {
  const links = await t.deps.links.listLinksForEvent(eventId);
  return links.find((x) => x.purpose === "report" && x.state === "active")?.url ?? `${t.deps.appUrl.replace(/\/$/, "")}/admin/events/${eventId}`;
}

async function askNext(t: Turn): Promise<void> {
  const d = data(t);
  if (!d.eventId) return showMenu(t);
  const ctx = await t.deps.links.reportContext(d.eventId, t.locale);
  const answers = d.answers ?? {};
  const done = new Set(d.done ?? []);
  const qs = chatQuestions(ctx.definition, answers);
  const next = qs.find((q) => !done.has(q.id));
  if (next) {
    setStep(t, "report", "ask", d as Record<string, unknown>);
    const n = qs.filter((q) => done.has(q.id)).length + 1;
    const help = next.help ? ((t.locale === "hi" ? next.help.hi : null) ?? next.help.en) : null;
    const q = COPY.reportQuestion(n, qs.length, label(next, t), help, !next.required);
    return next.required ? say(t, q) : buttons(t, q, [{ id: "skip", label: LABEL.skip }]);
  }

  // All asked: validate the whole report like the form would.
  const full: AnswerMap = { ...ctx.prefill, ...answers };
  const result = validateAnswers(ctx.definition, full);
  if (!result.ok) {
    const byField = new Map(result.errors.map((e) => [e.path, e.message]));
    const failing = qs.find((q) => byField.has(q.id));
    if (failing) {
      d.done = (d.done ?? []).filter((id) => id !== failing.id);
      delete d.answers?.[failing.id];
      const m = byField.get(failing.id);
      say(t, `${pick(t.locale, COPY.reportFix)} ${m ? ((t.locale === "hi" ? m.hi : null) ?? m.en) : ""}`);
      return askNext(t);
    }
    resetFlow(t);
    return say(t, COPY.reportFull(await reportUrl(t, d.eventId)));
  }
  const ev = await t.deps.repo.eventById(d.eventId);
  const lines = qs
    .filter((q) => q.id in answers)
    .map((q) => `${label(q, t)}: ${answers[q.id]}`)
    .join("\n");
  setStep(t, "report", "confirm", d as Record<string, unknown>);
  buttons(t, COPY.reportSummary((t.locale === "hi" ? ev?.titleHi : null) ?? ev?.titleEn ?? "", lines || "-"), [
    { id: "c:yes", label: LABEL.confirm },
    { id: "c:edit", label: LABEL.edit },
    { id: "c:no", label: LABEL.cancel },
  ]);
}

async function begin(t: Turn, eventId: string): Promise<void> {
  const ev = await t.deps.repo.eventById(eventId);
  if (!ev || !t.actor || !(t.actor.all || t.actor.unitIds.has(ev.samithiId))) return say(t, COPY.notAllowed);
  if (ev.status !== "planned" && ev.status !== "awaiting_report") {
    resetFlow(t);
    say(t, COPY.reportAlready);
    return showMenu(t, false);
  }
  try {
    await t.deps.links.reportContext(eventId, t.locale);
  } catch (err) {
    if (err instanceof ApiError) {
      resetFlow(t);
      return say(t, COPY.reportNoForm(await reportUrl(t, eventId)));
    }
    throw err;
  }
  t.conv.state = { flow: "report", step: "ask", data: { eventId, answers: {}, done: [], photos: [] } };
  say(t, COPY.reportIntro((t.locale === "hi" ? ev.titleHi : null) ?? ev.titleEn));
  return askNext(t);
}

async function submit(t: Turn): Promise<void> {
  const d = data(t);
  const actor = t.actor;
  if (!actor || !d.eventId) return showMenu(t);
  const ctx = await t.deps.links.reportContext(d.eventId, t.locale);
  const ev = await t.deps.repo.eventById(d.eventId);
  try {
    await t.deps.links.submitExternal({
      eventId: d.eventId,
      answers: { ...ctx.prefill, ...(d.answers ?? {}) },
      source: "whatsapp",
      byLabel: actor.name,
      byHash: t.conv.phoneHash,
      byMasked: t.conv.phoneMasked,
      locale: t.locale,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      resetFlow(t);
      if (err.code === "CONFLICT") say(t, COPY.reportAlready);
      else if (err.code === "VALIDATION_FAILED") say(t, COPY.reportFull(await reportUrl(t, d.eventId)));
      else say(t, COPY.trouble);
      return showMenu(t, false);
    }
    throw err;
  }
  if (d.photos?.length) {
    await t.deps.repo.portal.insertAudit(
      auditRec(actor, { action: "report.photo_received", entity: "event", entityId: d.eventId, scopeId: ev?.samithiId ?? null, data: { count: d.photos.length, via: "whatsapp" } }),
    );
  }
  const o = await loadOrg(t.deps.repo);
  const district = ev ? o.get(ev.districtId) : undefined;
  resetFlow(t);
  say(t, COPY.reportDone(t.locale === "hi" ? (district?.nameHi ?? district?.nameEn ?? "") : (district?.nameEn ?? "")));
  showMenu(t, false);
}

export const reportFlow: Flow = {
  async start(t) {
    const actor = t.actor;
    if (!actor) return say(t, COPY.notAllowed);
    const org = await loadOrg(t.deps.repo);
    const endOfToday = istDayStart(addDays(istDate(t.deps.now()), 1));
    const { rows } = await t.deps.repo.portal.listAdminEvents({
      samithiIds: scopeSamithiIds(actor, org),
      statuses: ["planned", "awaiting_report"],
      to: endOfToday,
      sort: "-startsAt",
      limit: 10,
      offset: 0,
    });
    if (rows.length === 0) {
      say(t, COPY.reportNone);
      return showMenu(t, false);
    }
    if (rows.length === 1) return begin(t, rows[0].id);
    t.conv.state = { flow: "report", step: "pick", data: {} };
    list(
      t,
      COPY.reportPickEvent,
      LABEL.choose,
      rows.map((e) => ({ id: `ev:${e.id}`, title: (t.locale === "hi" ? e.titleHi : null) ?? e.titleEn, description: org.get(e.samithiId)?.nameEn ?? "" })),
    );
  },

  async step(t) {
    const d = data(t);
    const step = t.conv.state.step;
    const rid = t.input.replyId;
    const text = t.input.text?.trim() ?? null;

    if (step === "pick") {
      if (rid?.startsWith("ev:")) return begin(t, rid.slice(3));
      return reportFlow.start(t);
    }
    if (t.input.media && !text && !rid && step !== "pick") {
      (d.photos ??= []).push(t.input.media.name);
      say(t, COPY.reportPhoto);
      return askNext(t);
    }
    if (step === "confirm") {
      if (rid === "c:yes") return submit(t);
      if (rid === "c:edit") {
        d.answers = {};
        d.done = [];
        return askNext(t);
      }
      if (rid === "c:no") {
        resetFlow(t);
        say(t, COPY.cancelled);
        return showMenu(t, false);
      }
      return askNext(t);
    }
    if (step === "ask" && d.eventId) {
      const ctx = await t.deps.links.reportContext(d.eventId, t.locale);
      const answers = d.answers ?? {};
      const done = new Set(d.done ?? []);
      const q = chatQuestions(ctx.definition, answers).find((x) => !done.has(x.id));
      if (!q) return askNext(t);
      if (!q.required && (rid === "skip" || isSkip(text))) {
        (d.done ??= []).push(q.id);
        return askNext(t);
      }
      const n = parseWholeNumber(text);
      const min = q.min ?? 0;
      if (n === null || n < min || (q.max !== null && n > q.max)) {
        const bad = COPY.reportNumberBad(min, q.max);
        return q.required ? say(t, bad) : buttons(t, bad, [{ id: "skip", label: LABEL.skip }]);
      }
      (d.answers ??= {})[q.id] = n;
      (d.done ??= []).push(q.id);
      // A "yes, there were some" answer may reveal follow-up questions; askNext recomputes the list.
      return askNext(t);
    }
    return showMenu(t);
  },
};

