// Plan an activity by chat (spec 50 flow 2): seva type → date → time → venue →
// volunteers → partner → summary → confirm. Creates the event and submits it for approval.
import type { Locale, SevaType } from "@/contract";
import { can } from "../../auth/rbac";
import { istInstant } from "../../domain/time";
import { ApiError } from "../../http/errors";
import { OrgIndex } from "../../services/org-index";
import { COPY, LABEL, pick } from "./copy";
import { fmtWhen, pushApprovalCard } from "./approvals";
import { showMenu } from "./menu";
import { fold, isSkip, parseFutureDate, parseTime, parseWholeNumber } from "./parse";
import { buttons, list, resetFlow, say, setStep } from "./reply";
import type { Flow, Turn } from "./types";

interface PlanData {
  seva?: SevaType;
  samithiId?: string;
  date?: string;
  time?: string;
  venue?: string;
  volunteers?: number | null;
  partner?: string | null;
}

const data = (t: Turn) => t.conv.state.data as PlanData;
const l = (t: Turn): Locale => t.locale;

async function org(t: Turn): Promise<OrgIndex> {
  const [units, seva] = await Promise.all([t.deps.repo.orgUnits(), t.deps.repo.sevaTypes()]);
  return new OrgIndex(units, seva);
}

/** Samithis the planner may plan for. */
async function samithisInScope(t: Turn) {
  const o = await org(t);
  const a = t.actor;
  if (!a) return [];
  if (a.role === "samithi_coord") return a.scopeId ? [o.get(a.scopeId)].filter((u) => !!u && u.active) : [];
  const all = o.districts().flatMap((d) => o.samithisOf(d.id));
  return a.all ? all : all.filter((s) => a.unitIds.has(s.id));
}

async function ask(t: Turn): Promise<void> {
  const d = data(t);
  if (!d.seva) {
    setStep(t, "plan", "seva");
    const types = (await t.deps.repo.sevaTypes()).filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder);
    return list(
      t,
      COPY.planSeva,
      LABEL.choose,
      types.map((s) => ({ id: `seva:${s.code}`, title: l(t) === "hi" ? (s.labelHi ?? s.labelEn) : s.labelEn })),
    );
  }
  if (!d.samithiId) {
    const scope = await samithisInScope(t);
    if (scope.length === 1 && scope[0]) {
      d.samithiId = scope[0].id;
    } else {
      setStep(t, "plan", "samithi");
      return say(t, COPY.planSamithi);
    }
  }
  if (!d.date) {
    setStep(t, "plan", "date");
    return buttons(t, COPY.planDate, [
      { id: "date:today", label: LABEL.today },
      { id: "date:tomorrow", label: LABEL.tomorrow },
      { id: "date:pick", label: LABEL.pick },
    ]);
  }
  if (!d.time) {
    setStep(t, "plan", "time");
    return say(t, COPY.planTime);
  }
  if (!d.venue) {
    setStep(t, "plan", "venue");
    return say(t, COPY.planVenue);
  }
  if (!("volunteers" in d)) {
    setStep(t, "plan", "volunteers");
    return buttons(t, COPY.planVolunteers, [{ id: "skip", label: LABEL.skip }]);
  }
  if (!("partner" in d)) {
    setStep(t, "plan", "partner");
    return buttons(t, COPY.planPartner, [{ id: "skip", label: LABEL.skip }]);
  }
  setStep(t, "plan", "confirm");
  const o = await org(t);
  const sevaLabel = await sevaName(t, d.seva);
  const when = fmtWhen(istInstant(d.date, d.time), l(t));
  const samithi = o.get(d.samithiId ?? "");
  const lines = [
    `${pick(l(t), { en: "Seva", hi: "सेवा" })}: ${sevaLabel}`,
    `${pick(l(t), { en: "When", hi: "कब" })}: ${when}`,
    `${pick(l(t), { en: "Venue", hi: "स्थान" })}: ${d.venue}`,
    `${pick(l(t), { en: "Samithi", hi: "समिति" })}: ${l(t) === "hi" ? (samithi?.nameHi ?? samithi?.nameEn) : samithi?.nameEn}`,
    ...(d.volunteers !== null && d.volunteers !== undefined ? [`${pick(l(t), { en: "Volunteers needed", hi: "स्वयंसेवक चाहिए" })}: ${d.volunteers}`] : []),
    ...(d.partner ? [`${pick(l(t), { en: "Partner", hi: "साझेदार" })}: ${d.partner}`] : []),
  ];
  buttons(t, `${pick(l(t), { en: "Please check your plan:", hi: "अपनी योजना जाँच लें:" })}\n${lines.join("\n")}`, [
    { id: "c:yes", label: LABEL.confirm },
    { id: "c:edit", label: LABEL.edit },
    { id: "c:no", label: LABEL.cancel },
  ]);
}

async function sevaName(t: Turn, code: SevaType): Promise<string> {
  const s = (await t.deps.repo.sevaTypes()).find((x) => x.code === code);
  return s ? (l(t) === "hi" ? (s.labelHi ?? s.labelEn) : s.labelEn) : code;
}

async function create(t: Turn): Promise<void> {
  const actor = t.actor;
  const d = data(t);
  if (!actor || !d.seva || !d.samithiId || !d.date || !d.time || !d.venue) return showMenu(t);
  const o = await org(t);
  const samithi = o.get(d.samithiId);
  const [en, hi] = await Promise.all([sevaNameLocale(t, d.seva, "en"), sevaNameLocale(t, d.seva, "hi")]);
  const partnerEn = d.partner ? ` Partner: ${d.partner}.` : "";
  const partnerHi = d.partner ? ` साझेदार: ${d.partner}।` : "";
  try {
    const ev = await t.deps.portal.events.create(
      actor,
      {
        sevaType: d.seva,
        title: { en: `${en} – ${shortName(samithi?.nameEn)}`.slice(0, 200), hi: `${hi} – ${shortName(samithi?.nameHi ?? samithi?.nameEn)}`.slice(0, 200) },
        startsAt: istInstant(d.date, d.time).toISOString(),
        endsAt: null,
        samithiId: d.samithiId,
        venueName: d.venue.slice(0, 200),
        venueAddress: "",
        geo: null,
        partnerId: null,
        volunteersNeeded: d.volunteers ?? null,
        bring: [],
        description: {
          en: `${en} organised by ${samithi?.nameEn ?? "the samithi"}.${partnerEn} Planned on WhatsApp; details to be completed in the portal.`,
          hi: `${hi}, ${samithi?.nameHi ?? samithi?.nameEn ?? "समिति"} द्वारा आयोजित।${partnerHi} WhatsApp पर योजना बनी; विवरण पोर्टल में पूरे करें।`,
        },
        recurring: false,
        submit: true,
      },
      t.locale,
    );
    const rec = await t.deps.repo.eventById(ev.id);
    const district = o.get(rec?.districtId ?? "");
    resetFlow(t);
    if (ev.status === "awaiting_approval") {
      say(t, COPY.planSent(l(t) === "hi" ? (district?.nameHi ?? district?.nameEn ?? "") : (district?.nameEn ?? "")));
      if (rec) await pushApprovalCard(t.deps, rec, "plan");
    } else {
      say(t, COPY.planApproved);
    }
    showMenu(t, false);
  } catch (err) {
    if (err instanceof ApiError && err.code === "VALIDATION_FAILED") {
      say(t, `${pick(l(t), COPY.planNeedsEdit)} ${Object.values(err.fields ?? {}).join(" ")}`);
      t.conv.state = { flow: "plan", step: "confirm", data: d as Record<string, unknown> };
      return ask(t);
    }
    if (err instanceof ApiError) {
      resetFlow(t);
      return say(t, err.code === "FORBIDDEN" ? COPY.notAllowed : COPY.trouble);
    }
    throw err;
  }
}

/** Samithi name without its generic prefix ("Sai Centre Mayur Vihar" -> "Mayur Vihar"), so titles stay short and don't repeat the venue. */
const shortName = (name: string | null | undefined): string => (name ?? "").replace(/^(sai\s+(centre|center|samithi)|samithi|साई\s+(केंद्र|समिति)|समिति)\s+/i, "").trim() || (name ?? "");

async function sevaNameLocale(t: Turn, code: SevaType, loc: Locale): Promise<string> {
  const s = (await t.deps.repo.sevaTypes()).find((x) => x.code === code);
  return s ? (loc === "hi" ? (s.labelHi ?? s.labelEn) : s.labelEn) : code;
}

export const planFlow: Flow = {
  async start(t) {
    if (!t.actor || !can(t.actor, "events.plan")) return say(t, COPY.notAllowed);
    t.conv.state = { flow: "plan", step: "seva", data: {} };
    await ask(t);
  },

  async step(t) {
    const d = data(t);
    const step = t.conv.state.step;
    const text = t.input.text?.trim() ?? null;
    const rid = t.input.replyId;

    if (step === "seva") {
      const code = rid?.startsWith("seva:") ? rid.slice(5) : null;
      const types = await t.deps.repo.sevaTypes();
      const hit = types.find((s) => s.active && (s.code === code || (text && [s.labelEn, s.labelHi ?? ""].some((n) => fold(n) === fold(text)))));
      if (!hit) return ask(t);
      d.seva = hit.code;
      return ask(t);
    }
    if (step === "samithi") {
      const scope = await samithisInScope(t);
      const q = fold(text ?? "");
      const hits = q ? scope.filter((s) => s && [s.nameEn, s.nameHi ?? ""].some((n) => fold(n).includes(q))) : [];
      if (hits.length !== 1 || !hits[0]) return say(t, COPY.planSamithiNo(scope.slice(0, 5).map((s) => s?.nameEn).join(", ")));
      d.samithiId = hits[0].id;
      return ask(t);
    }
    if (step === "date") {
      if (rid === "date:today" || rid === "date:tomorrow") {
        const r = parseFutureDate(rid === "date:today" ? "today" : "tomorrow", t.deps.now());
        if ("date" in r) d.date = r.date;
        return ask(t);
      }
      if (rid === "date:pick") {
        setStep(t, "plan", "datepick");
        return say(t, COPY.planDatePick);
      }
      return stepDateText(t, text);
    }
    if (step === "datepick") return stepDateText(t, text);
    if (step === "time") {
      const time = parseTime(text);
      if (!time) return say(t, COPY.planTimeBad);
      d.time = time;
      return ask(t);
    }
    if (step === "venue") {
      if (!text || text.length < 2) return say(t, COPY.planVenueBad);
      d.venue = text.slice(0, 200);
      return ask(t);
    }
    if (step === "volunteers") {
      if (rid === "skip" || isSkip(text)) d.volunteers = null;
      else {
        const n = parseWholeNumber(text);
        if (n === null || n > 10_000) return buttons(t, COPY.planVolunteersBad, [{ id: "skip", label: LABEL.skip }]);
        d.volunteers = n;
      }
      return ask(t);
    }
    if (step === "partner") {
      d.partner = rid === "skip" || !text || isSkip(text) ? null : text.slice(0, 120);
      return ask(t);
    }
    if (step === "confirm") {
      if (rid === "c:yes") return create(t);
      if (rid === "c:edit") {
        t.conv.state = { flow: "plan", step: "seva", data: {} };
        return ask(t);
      }
      if (rid === "c:no") {
        resetFlow(t);
        say(t, COPY.cancelled);
        return showMenu(t, false);
      }
      return ask(t);
    }
    return showMenu(t);
  },
};

async function stepDateText(t: Turn, text: string | null) {
  const r = parseFutureDate(text, t.deps.now());
  if ("error" in r) return say(t, r.error === "past" ? COPY.planDatePast : COPY.planDateBad);
  data(t).date = r.date;
  return ask(t);
}
