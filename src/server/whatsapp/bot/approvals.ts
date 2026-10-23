// District approvals by chat (spec 50 flows 3 and 6): list → card → Approve / Reject (with reason) / Ask.
import type { Locale } from "@/contract";
import { ApiError } from "../../http/errors";
import type { UserRec } from "../../repo/portal-types";
import type { EventRec } from "../../repo/types";
import { inSessionWindow } from "../conversations";
import { phoneHash } from "../../security/phone";
import { COPY, LABEL, pick } from "./copy";
import { holders, phoneOf, showMenu } from "./menu";
import { reachUser } from "./reach";
import { buttons, list, resetFlow, say, setStep } from "./reply";
import type { BotDeps, Turn } from "./types";

export function fmtWhen(d: Date, l: Locale): string {
  return new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(d);
}

const titleOf = (ev: EventRec, l: Locale) => (l === "hi" ? ev.titleHi : null) ?? ev.titleEn;

async function orgName(deps: BotDeps, unitId: string, l: Locale): Promise<string> {
  const u = (await deps.repo.orgUnits()).find((x) => x.id === unitId);
  return u ? ((l === "hi" ? u.nameHi : null) ?? u.nameEn) : "";
}

/** Card text for an approval; reports include their key numbers. */
export async function cardText(deps: BotDeps, ev: EventRec, l: Locale, kind: "plan" | "report"): Promise<string> {
  const samithi = await orgName(deps, ev.samithiId, l);
  if (kind === "plan") {
    const lines = [
      pick(l, { en: "Plan for approval", hi: "स्वीकृति के लिए योजना" }),
      titleOf(ev, l),
      `${fmtWhen(ev.startsAt, l)} · ${ev.venueName}`,
      samithi,
      ev.volunteersNeeded !== null ? pick(l, { en: `Volunteers needed: ${ev.volunteersNeeded}`, hi: `स्वयंसेवक चाहिए: ${ev.volunteersNeeded}` }) : "",
    ];
    return lines.filter(Boolean).join("\n");
  }
  const facts = await deps.repo.portal.factsForEvents([ev.id]);
  const totals = facts.filter((f) => f.dim === "" && f.value !== null);
  const lines = [pick(l, { en: "Report for approval", hi: "स्वीकृति के लिए रिपोर्ट" }), `${titleOf(ev, l)} · ${samithi}`];
  for (const f of totals.slice(0, 6)) lines.push(`${f.kpiKey}: ${f.value}`);
  return lines.join("\n");
}

const cardButtons = (eventId: string) => [
  { id: `ap:yes:${eventId}`, label: LABEL.approve },
  { id: `ap:no:${eventId}`, label: LABEL.reject },
  { id: `ap:ask:${eventId}`, label: LABEL.ask },
];

/**
 * Pushes the approval card to the district's coordinators who are inside their
 * 24-hour window (others get the template sent by the lifecycle). Best effort.
 */
export async function pushApprovalCard(deps: BotDeps, ev: EventRec, kind: "plan" | "report"): Promise<number> {
  let sent = 0;
  for (const p of await holders(deps, "district_coord", ev.districtId)) {
    const phone = phoneOf(deps, p.user);
    if (!phone) continue;
    const conv = await deps.repo.wa.conversationByHash(phoneHash(deps.secret, phone));
    if (!inSessionWindow(conv, deps.now())) continue;
    try {
      const text = await cardText(deps, ev, p.user.locale, kind);
      await deps.whatsapp.sendInteractive(phone, {
        kind: "buttons",
        text,
        buttons: cardButtons(ev.id).map((b) => ({ id: b.id, title: pick(p.user.locale, b.label).slice(0, 20) })),
        list: null,
      });
      sent++;
    } catch (err) {
      console.error("[bot] approval card failed", err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export async function startApprovals(t: Turn): Promise<void> {
  const actor = t.actor;
  if (!actor) return say(t, COPY.notAllowed);
  try {
    const [plans, reports] = await Promise.all([
      t.deps.portal.approvals.list(actor, { tab: "plans", page: 1, pageSize: 10 }),
      t.deps.portal.approvals.list(actor, { tab: "reports", page: 1, pageSize: 10 }),
    ]);
    const rows = [...plans.data, ...reports.data].slice(0, 10).map((a) => ({
      id: `ap:${a.event.id}`,
      title: (t.locale === "hi" ? a.event.title.hi : null) ?? a.event.title.en,
      description: `${a.kind === "plan" ? pick(t.locale, { en: "Plan", hi: "योजना" }) : pick(t.locale, { en: "Report", hi: "रिपोर्ट" })} · ${a.event.samithi.name.en}`,
    }));
    if (rows.length === 0) return showEmpty(t);
    resetFlow(t);
    list(t, COPY.approvalsPick, LABEL.choose, rows);
  } catch (err) {
    if (err instanceof ApiError) return say(t, COPY.notAllowed);
    throw err;
  }
}

function showEmpty(t: Turn) {
  say(t, COPY.approvalsNone);
  showMenu(t, false);
}

/** `ap:<eventId>` → card with decision buttons. */
export async function showCard(t: Turn, eventId: string): Promise<void> {
  const ev = await t.deps.repo.eventById(eventId);
  if (!ev || !t.actor || !(t.actor.all || t.actor.unitIds.has(ev.samithiId))) return say(t, COPY.notAllowed);
  const kind = ev.status === "awaiting_approval" || (ev.status === "escalated" && ev.escalatedFrom === "awaiting_approval") ? "plan" : ev.status === "report_submitted" || ev.status === "escalated" ? "report" : null;
  if (!kind) return say(t, COPY.alreadyDecided);
  buttons(t, await cardText(t.deps, ev, t.locale, kind), cardButtons(ev.id));
}

const actionFor = (ev: EventRec): "approve-plan" | "approve-report" | null => {
  const waiting = ev.status === "escalated" ? ev.escalatedFrom : ev.status;
  return waiting === "awaiting_approval" ? "approve-plan" : waiting === "report_submitted" ? "approve-report" : null;
};

async function notifyPlanDecision(deps: BotDeps, ev: EventRec, decision: { en: string; hi: string }) {
  if (!ev.createdBy) return;
  const creator = await deps.repo.portal.userById(ev.createdBy);
  if (!creator) return;
  const l = creator.locale;
  const title = titleOf(ev, l);
  await reachUser(deps, creator, `${title}: ${pick(l, decision)}`, { template: "plan_decision", params: [title, pick(l, decision)] });
}

/** `ap:yes|no|ask:<eventId>` from a card button. */
export async function decide(t: Turn, verb: "yes" | "no" | "ask", eventId: string): Promise<void> {
  const actor = t.actor;
  const ev = await t.deps.repo.eventById(eventId);
  if (!actor || !ev || !(actor.all || actor.unitIds.has(ev.samithiId))) return say(t, COPY.notAllowed);
  const action = actionFor(ev);
  if (!action) return say(t, COPY.alreadyDecided);
  if (verb === "no") {
    setStep(t, "approvals", "reason", { eventId });
    return say(t, COPY.rejectWhy);
  }
  if (verb === "ask") {
    setStep(t, "approvals", "question", { eventId });
    return say(t, COPY.askWhat);
  }
  try {
    await t.deps.portal.events.act(actor, eventId, action, {}, t.locale);
  } catch (err) {
    if (err instanceof ApiError) return say(t, err.code === "CONFLICT" ? COPY.alreadyDecided : COPY.notAllowed);
    throw err;
  }
  if (action === "approve-plan") await notifyPlanDecision(t.deps, ev, { en: "approved. The report link will reach you on WhatsApp.", hi: "स्वीकृत हो गई। रिपोर्ट लिंक आपको WhatsApp पर मिलेगा।" });
  say(t, COPY.approvedOk);
  showMenu(t, false);
}

/** Steps while collecting a reject reason or a question. */
export async function approvalsStep(t: Turn): Promise<void> {
  const { step, data } = t.conv.state;
  const eventId = String(data.eventId ?? "");
  const text = t.input.text?.trim() ?? "";
  const actor = t.actor;
  const ev = await t.deps.repo.eventById(eventId);
  if (!actor || !ev) return showMenu(t);
  if (text.length < 3) return say(t, step === "reason" ? COPY.rejectWhy : COPY.askWhat);

  if (step === "reason") {
    const action = actionFor(ev);
    if (!action) {
      resetFlow(t);
      return say(t, COPY.alreadyDecided);
    }
    try {
      await t.deps.portal.events.act(actor, eventId, "request-changes", { reason: text.slice(0, 500) }, t.locale);
    } catch (err) {
      if (err instanceof ApiError) {
        resetFlow(t);
        return say(t, err.code === "CONFLICT" ? COPY.alreadyDecided : COPY.notAllowed);
      }
      throw err;
    }
    if (action === "approve-plan") await notifyPlanDecision(t.deps, ev, { en: `sent back. Reason: ${text}`, hi: `वापस भेजी गई। कारण: ${text}` });
    say(t, COPY.rejectDone);
    return showMenu(t, false);
  }

  // question → the planner, whose next message comes back to this coordinator
  const creator = ev.createdBy ? await t.deps.repo.portal.userById(ev.createdBy) : null;
  if (!creator) {
    say(t, COPY.askNoPhone);
    return showMenu(t, false);
  }
  const l = creator.locale;
  const label = actor.name;
  const q = text.slice(0, 500);
  const reached = await reachUser(t.deps, creator, `${label}: ${q}`, { template: "plan_decision", params: [titleOf(ev, l), `${label}: ${q}`] });
  if (reached) await armAnswer(t.deps, creator, actor.userId, actor.name, titleOf(ev, l));
  say(t, reached ? COPY.askSent : COPY.askNoPhone);
  return showMenu(t, false);
}

/** The planner's next free-text message is forwarded to the person who asked. */
async function armAnswer(deps: BotDeps, to: UserRec, askerId: string, askerName: string, title: string) {
  const phone = phoneOf(deps, to);
  if (!phone) return;
  const conv = await deps.repo.wa.conversationByHash(phoneHash(deps.secret, phone));
  if (!conv) return;
  conv.state = { flow: "answer", step: "reply", data: { askerId, askerName, title } };
  conv.expiresAt = new Date(deps.now().getTime() + 24 * 60 * 60 * 1000);
  await deps.repo.wa.saveConversation(conv);
}

/** Planner answers a district question. */
export async function answerStep(t: Turn): Promise<void> {
  const { data } = t.conv.state;
  const text = t.input.text?.trim();
  if (!text) return say(t, COPY.askWhat);
  const asker = await t.deps.repo.portal.userById(String(data.askerId ?? ""));
  if (asker) {
    const who = t.user?.name ?? "";
    const msg = pick(asker.locale, COPY.askForwarded(who, text));
    await reachUser(t.deps, asker, msg, { template: "plan_decision", params: [String(data.title ?? ""), msg] });
  }
  say(t, COPY.replyForwarded);
  showMenu(t, false);
}

