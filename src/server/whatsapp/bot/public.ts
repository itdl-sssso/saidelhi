// Public and utility flows: What's on near me, Join updates, Contact a centre,
// My events, Help and the human hand-off (spec 50 flows 1, 8, 9).
import type { EventPublic, Locale } from "@/contract";
import { newId } from "../../db/columns";
import { ApiError } from "../../http/errors";
import type { OptInRec } from "../../repo/wa-types";
import { COPY, LABEL, pick, STATUS_LABEL } from "./copy";
import { fmtWhen } from "./approvals";
import { canApprove, isCoordinator, showMenu } from "./menu";
import { fold, isSkip } from "./parse";
import { buttons, resetFlow, say, setStep } from "./reply";
import type { Flow, Turn } from "./types";
import { loadOrg } from "../../services/shared";
import { OrgIndex } from "../../services/org-index";

const pathPrefix = (l: Locale) => (l === "hi" ? "/hi" : "");
const link = (t: Turn, path: string) => `${t.deps.appUrl.replace(/\/$/, "")}${pathPrefix(t.locale)}${path}`;

/** A district (and its display name) from a pincode, area or district name. */
async function resolveDistrict(t: Turn, text: string): Promise<{ slug: string; id: string; name: string } | null> {
  const org: OrgIndex = await loadOrg(t.deps.repo);
  const q = fold(text);
  if (!q) return null;
  const nameOf = (u: { nameEn: string; nameHi: string | null }) => (t.locale === "hi" ? (u.nameHi ?? u.nameEn) : u.nameEn);
  if (!/^\d{6}$/.test(text.trim())) {
    const d = org.districts().find((u) => [u.nameEn, u.nameHi ?? "", u.slug].some((n) => fold(n) === q || fold(n).includes(q)));
    if (d) return { slug: d.slug, id: d.id, name: nameOf(d) };
  }
  const centres = await t.deps.centres.list({ q: text.trim(), page: 1, pageSize: 1 });
  const c = centres.data[0];
  if (!c) return null;
  const d = org.get(c.districtId);
  return d ? { slug: d.slug, id: d.id, name: nameOf(d) } : null;
}

function eventLine(t: Turn, e: EventPublic): string {
  const title = (t.locale === "hi" ? e.title.hi : null) ?? e.title.en;
  const url = e.id.startsWith("gath_") && e.centre ? link(t, `/centres/${e.centre.slug}`) : link(t, `/events/${e.id}`);
  return `• ${title} — ${fmtWhen(new Date(e.startsAt), t.locale)}\n${url}`;
}

export const nearFlow: Flow = {
  async start(t) {
    t.conv.state = { flow: "near", step: "ask", data: {} };
    say(t, COPY.nearAsk);
  },
  async step(t) {
    const text = t.input.text?.trim() ?? "";
    if (!text) return say(t, COPY.nearAsk);
    const place = await resolveDistrict(t, text);
    if (!place) return say(t, COPY.nearUnknown);
    const page = await t.deps.events.list({ page: 1, pageSize: 100, district: place.slug });
    // Real events first; the centres' weekly gatherings fill the rest.
    const rows = [...page.data.filter((e) => !e.id.startsWith("gath_")), ...page.data.filter((e) => e.id.startsWith("gath_"))].slice(0, 5);
    resetFlow(t);
    if (rows.length === 0) {
      say(t, COPY.nearNone);
      return showMenu(t, false);
    }
    say(t, `${pick(t.locale, COPY.nearHead(place.name))}\n${rows.map((e) => eventLine(t, e)).join("\n")}`);
    showMenu(t, false);
  },
};

export const contactFlow: Flow = {
  async start(t) {
    t.conv.state = { flow: "contact", step: "ask", data: {} };
    say(t, COPY.contactAsk);
  },
  async step(t) {
    const text = t.input.text?.trim() ?? "";
    if (!text) return say(t, COPY.contactAsk);
    let found = await t.deps.centres.list({ q: text, page: 1, pageSize: 3 });
    if (found.data.length === 0) {
      const place = await resolveDistrict(t, text);
      if (place) found = await t.deps.centres.list({ district: place.slug, page: 1, pageSize: 3 });
    }
    resetFlow(t);
    if (found.data.length === 0) {
      say(t, COPY.contactNone);
      return showMenu(t, false);
    }
    const lines = found.data.map((c) => `• ${(t.locale === "hi" ? c.name.hi : null) ?? c.name.en}\n${(t.locale === "hi" ? c.address.hi : null) ?? c.address.en}${c.contactPhone ? `\n${c.contactPhone}` : ""}`);
    say(t, `${pick(t.locale, COPY.contactHead)}\n${lines.join("\n")}`);
    showMenu(t, false);
  },
};

export const joinFlow: Flow = {
  async start(t) {
    t.conv.state = { flow: "join", step: "ask", data: {} };
    buttons(t, COPY.joinAsk, [
      { id: "c:yes", label: LABEL.yes },
      { id: "c:no", label: LABEL.no },
    ]);
  },
  async step(t) {
    const { step } = t.conv.state;
    const rid = t.input.replyId;
    const text = t.input.text?.trim() ?? "";
    if (step === "ask") {
      if (rid === "c:no") {
        resetFlow(t);
        say(t, COPY.joinDeclined);
        return showMenu(t, false);
      }
      if (rid !== "c:yes") return joinFlow.start(t);
      setStep(t, "join", "district", {});
      return buttons(t, COPY.joinDistrict, [{ id: "skip", label: LABEL.skip }]);
    }
    let districtId: string | null = null;
    if (!(rid === "skip" || isSkip(text))) {
      const place = await resolveDistrict(t, text);
      if (!place) return say(t, COPY.nearUnknown);
      districtId = place.id;
    }
    await recordOptIn(t, districtId);
    resetFlow(t);
    say(t, COPY.joinDone);
    showMenu(t, false);
  },
};

/** Consent given in chat (explicit button/keyword) for broadcast updates. */
export async function recordOptIn(t: Turn, districtId: string | null): Promise<void> {
  const repo = t.deps.repo.wa;
  const at = t.deps.now();
  const prior = await repo.optInByHash(t.conv.phoneHash);
  const rec: OptInRec = {
    id: prior?.id ?? newId(),
    phoneHash: t.conv.phoneHash,
    phoneEnc: t.conv.phoneEnc,
    phoneMasked: t.conv.phoneMasked,
    districtId: districtId ?? prior?.districtId ?? null,
    sevaTypes: prior?.sevaTypes ?? [],
    locale: t.locale,
    status: "opted_in",
    via: prior?.via ?? "chat",
    requestedAt: prior?.requestedAt ?? at,
    consentAt: at,
    stoppedAt: null,
    ipHash: prior?.ipHash ?? null,
  };
  await repo.saveOptIn(rec);
}

export async function myEvents(t: Turn): Promise<void> {
  const actor = t.actor;
  if (!actor || !isCoordinator(t)) return say(t, COPY.notAllowed);
  try {
    const res = await t.deps.portal.events.list(actor, { page: 1, pageSize: 5, sort: "-startsAt" });
    if (res.data.length === 0) {
      say(t, COPY.eventsNone);
      return showMenu(t, false);
    }
    const lines = res.data.map((e) => {
      const title = (t.locale === "hi" ? e.title.hi : null) ?? e.title.en;
      return `• ${title} — ${fmtWhen(new Date(e.startsAt), t.locale)} — ${pick(t.locale, STATUS_LABEL[e.status])}`;
    });
    say(t, `${pick(t.locale, COPY.eventsHead)}\n${lines.join("\n")}`);
    showMenu(t, false);
  } catch (err) {
    if (err instanceof ApiError) return say(t, COPY.notAllowed);
    throw err;
  }
}

export async function help(t: Turn): Promise<void> {
  resetFlow(t);
  buttons(t, isCoordinator(t) ? (canApprove(t) ? COPY.helpApprover : COPY.help) : COPY.helpPublic, [
    { id: "h:human", label: LABEL.human },
    { id: "m:menu", label: LABEL.menu },
  ]);
}

export async function handoff(t: Turn, why: string): Promise<void> {
  await t.deps.ingest({ conversation: t.conv, actor: t.actor, text: why, media: null, note: "human_handoff" });
  resetFlow(t);
  say(t, COPY.handoff);
}
