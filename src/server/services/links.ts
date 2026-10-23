// Form links (§5.2): token → link state, OTP/bot-checked link sessions, the
// locked form, submissions, private attachments, plus helpers the portal (M3) calls.
import { createHash } from "node:crypto";
import {
  type AnswerMap,
  type EventCard,
  type EventStatus,
  type FormDefinition,
  type FormLink,
  type FormPayload,
  type I18nText,
  type LinkAttachment,
  type LinkInfo,
  type LinkPurpose,
  type LinkSession,
  type Locale,
  type OtpSent,
  type Submission,
  ATTACHMENT_LIMITS,
  formLinkPath,
  issuesToFieldMap,
  kpiFactsFromAnswers,
  splitPersonal,
  topLevelFields,
  validateAnswers,
} from "@/contract";
import { newId } from "../db/columns";
import { istDate, toIso } from "../domain/time";
import { sniffMime } from "../files";
import { ApiError, notFound } from "../http/errors";
import type { AttachmentRec, ConsentRec, LinkRec, LinkSessionRec, NewSubmissionWrite, SubmissionRec } from "../repo/links-types";
import type { DataRepo, EventRec } from "../repo/types";
import { decryptField, encryptField } from "../security/crypto";
import {
  csrfFor,
  deriveLinkToken,
  hashLinkToken,
  isWellFormedToken,
  issueBotChallenge,
  linkState,
  newLinkNonce,
  newSessionToken,
  sessionIdFor,
  verifyBotChallenge,
} from "../security/link-token";
import { maskPhone, normalisePhone, phoneHash } from "../security/phone";
import { otpPolicy, sendOtp, verifyOtp } from "./otp";
import { i18n } from "./org-index";
import { loadLinkDefaults, loadOrg } from "./shared";
import type { LinkServiceDeps, LinksService, NewLinkOptions, SessionGrant } from "./types";

export const LINK_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
/** Register photos are deleted a year after the event (spec 26). */
const ATTACHMENT_RETENTION_MS = 365 * DAY;

/** Event statuses that accept a report/desk submission or a public sign-up. */
const REPORTABLE: readonly EventStatus[] = ["planned", "awaiting_report", "report_submitted", "escalated"];
const SIGNUP_OPEN: readonly EventStatus[] = ["planned", "postponed"];
const LOCKED_EVENT: readonly EventStatus[] = ["approved", "cancelled"];

const MSG = {
  phone: { en: "Enter a 10-digit mobile number.", hi: "10 अंकों का मोबाइल नंबर लिखें।" },
  alreadySent: {
    en: "A report was already sent for this link. Open it and edit instead.",
    hi: "इस लिंक से रिपोर्ट पहले ही भेजी जा चुकी है। उसे खोलकर बदलाव करें।",
  },
  closed: { en: "This event is no longer accepting entries.", hi: "यह कार्यक्रम अब प्रविष्टियाँ स्वीकार नहीं कर रहा है।" },
  approved: { en: "This report is approved and can no longer be edited.", hi: "यह रिपोर्ट स्वीकृत हो चुकी है और अब बदली नहीं जा सकती।" },
  fileType: { en: "Attach a photo (JPG, PNG, WebP) or a PDF.", hi: "फ़ोटो (JPG, PNG, WebP) या PDF जोड़ें।" },
  fileSize: { en: "The file is larger than 10 MB.", hi: "फ़ाइल 10 MB से बड़ी है।" },
  fileField: { en: "This form has no such attachment field.", hi: "इस फ़ॉर्म में ऐसा कोई संलग्नक फ़ील्ड नहीं है।" },
  noForm: { en: "No published form exists for this seva type yet.", hi: "इस सेवा प्रकार के लिए अभी कोई प्रकाशित फ़ॉर्म नहीं है।" },
  noPhone: { en: "This link was not sent to a phone.", hi: "यह लिंक किसी फ़ोन पर नहीं भेजा गया था।" },
  notActive: { en: "Only active links can be resent.", hi: "केवल सक्रिय लिंक दोबारा भेजे जा सकते हैं।" },
  past: { en: "Choose a date in the future.", hi: "भविष्य की तारीख़ चुनें।" },
} satisfies Record<string, I18nText>;

const loc = (t: I18nText, locale: Locale) => (locale === "hi" ? t.hi : null) ?? t.en;

const PURPOSE_LABEL: Record<LinkPurpose, I18nText> = {
  report: { en: "Report link", hi: "रिपोर्ट लिंक" },
  desk: { en: "Desk link", hi: "डेस्क लिंक" },
  public: { en: "Sign-up link", hi: "पंजीकरण लिंक" },
};

interface Ctx {
  link: LinkRec;
  session: LinkSessionRec;
}

export function createLinksService(repo: DataRepo, deps: LinkServiceDeps): LinksService {
  const links = repo.links;
  const now = () => deps.now();
  const otpDeps = { repo: links, whatsapp: deps.whatsapp, secret: deps.secret, now, policy: () => otpPolicy(repo) };

  const tokenOf = (l: LinkRec) => deriveLinkToken(deps.secret, l.tokenNonce);
  const urlOf = (l: LinkRec, locale: Locale = "en") => `${deps.appUrl.replace(/\/$/, "")}${formLinkPath(tokenOf(l), locale)}`;

  async function byToken(token: string): Promise<LinkRec> {
    if (!isWellFormedToken(token)) throw notFound();
    const link = await links.linkByTokenHash(hashLinkToken(token));
    if (!link) throw notFound();
    return link;
  }

  async function eventOf(link: LinkRec): Promise<EventRec> {
    const ev = await repo.eventById(link.eventId);
    if (!ev) throw notFound();
    return ev;
  }

  async function card(ev: EventRec): Promise<EventCard> {
    const org = await loadOrg(repo);
    return {
      id: ev.id,
      title: i18n(ev.titleEn, ev.titleHi),
      sevaType: ev.sevaType,
      startsAt: toIso(ev.startsAt),
      venue: {
        name: ev.venueName,
        address: ev.venueAddress,
        geo: ev.venueLat !== null && ev.venueLng !== null ? { lat: ev.venueLat, lng: ev.venueLng } : null,
      },
      samithi: org.ref(ev.samithiId),
      district: org.ref(ev.districtId),
    };
  }

  /** Report links: the event's report; desk links: this desk's entry; public: this session's sign-up. */
  function scopeExisting(link: LinkRec, sessionId: string | null): Promise<SubmissionRec | null> {
    if (link.purpose === "report") return links.latestSubmission({ eventId: link.eventId, purpose: "report" });
    if (link.purpose === "desk") return links.latestSubmission({ eventId: link.eventId, linkId: link.id });
    return sessionId ? links.latestSubmission({ eventId: link.eventId, linkId: link.id, sessionId }) : Promise.resolve(null);
  }

  const editableSub = (s: SubmissionRec | null, ev: EventRec): s is SubmissionRec =>
    !!s && s.status !== "approved" && !LOCKED_EVENT.includes(ev.status);

  function gone(link: LinkRec, info: LinkInfo): ApiError {
    const code = info.state === "revoked" ? "LINK_REVOKED" : info.state === "expired" ? "LINK_EXPIRED" : "LINK_USED_UP";
    const safe = info.state === "revoked" || info.state === "expired";
    return new ApiError(code, { details: { link: { ...info, event: safe ? info.event : null, botChallenge: null } } });
  }

  async function sessionFor(link: LinkRec, sessionToken: string | null): Promise<LinkSessionRec | null> {
    if (!sessionToken) return null;
    const s = await links.sessionById(sessionIdFor(sessionToken));
    return s && s.linkId === link.id && s.expiresAt > now() ? s : null;
  }

  /**
   * Gate for every step after GET. Revoked/expired always 410. A used-up
   * report/desk link still lets its coordinators back in to edit what they sent.
   */
  async function assertUsable(link: LinkRec, ev: EventRec, mode: "new" | "existing", sessionId: string | null) {
    const state = linkState(link, now());
    if (state === "active") return;
    if (state === "used_up" && mode === "existing" && link.purpose !== "public" && editableSub(await scopeExisting(link, sessionId), ev)) return;
    throw gone(link, await infoOf(link, ev, false));
  }

  async function infoOf(link: LinkRec, ev: EventRec, hasSession: boolean): Promise<LinkInfo> {
    const state = linkState(link, now());
    const botAllowed = link.purpose === "public" || (link.purpose === "desk" && !link.otpRequired);
    return {
      state,
      purpose: link.purpose,
      event: await card(ev),
      otpRequired: link.purpose === "report" || (link.purpose === "desk" && link.otpRequired),
      deskLabel: link.purpose === "desk" ? link.label : null,
      expiresAt: toIso(link.expiresAt),
      botChallenge: botAllowed && state === "active" ? issueBotChallenge(deps.secret, link.id, now()) : null,
      hasSession,
    };
  }

  async function requireSession(token: string, sessionToken: string | null, mode: "new" | "existing"): Promise<Ctx & { ev: EventRec }> {
    const link = await byToken(token);
    const ev = await eventOf(link);
    const session = await sessionFor(link, sessionToken);
    const st = linkState(link, now());
    if (st === "revoked" || st === "expired") throw gone(link, await infoOf(link, ev, false));
    if (!session) throw new ApiError("UNAUTHENTICATED");
    await assertUsable(link, ev, mode, session.id);
    return { link, session, ev };
  }

  async function grant(link: LinkRec, phone: { hash: string; masked: string } | null): Promise<SessionGrant> {
    const sessionToken = newSessionToken();
    const expiresAt = new Date(now().getTime() + LINK_SESSION_TTL_MS);
    await links.insertSession({ id: sessionIdFor(sessionToken), linkId: link.id, phoneHash: phone?.hash ?? null, phoneMasked: phone?.masked ?? null, expiresAt });
    const csrf = csrfFor(deps.secret, sessionToken);
    const session: LinkSession = { expiresAt: toIso(expiresAt), csrf };
    return { session, sessionToken, csrf, maxAgeSeconds: Math.floor(LINK_SESSION_TTL_MS / 1000) };
  }

  function parsePhone(raw: string, locale: Locale) {
    const e164 = normalisePhone(raw);
    if (!e164) throw new ApiError("VALIDATION_FAILED", { fields: { phone: loc(MSG.phone, locale) } });
    return { e164, hash: phoneHash(deps.secret, e164), masked: maskPhone(e164) };
  }

  async function definitionOf(link: LinkRec): Promise<FormDefinition> {
    const v = await links.versionById(link.formVersionId);
    if (!v) throw new ApiError("INTERNAL", { message: "Form version missing" });
    return v.definition;
  }

  async function prefillFor(def: FormDefinition, ev: EventRec, locale: Locale): Promise<AnswerMap> {
    const out: AnswerMap = {};
    const org = await loadOrg(repo);
    const partner = ev.partnerId ? (await repo.partners([ev.partnerId]))[0] : undefined;
    const samithi = org.ref(ev.samithiId).name;
    for (const f of topLevelFields(def)) {
      if (f.prefill === "samithi") out[f.id] = loc(samithi, locale);
      else if (f.prefill === "date") out[f.id] = istDate(ev.startsAt);
      else if (f.prefill === "venue") out[f.id] = ev.venueName;
      else if (f.prefill === "partner" && partner) out[f.id] = partner.name;
    }
    return out;
  }

  /** Read-only prefilled fields always take the event's value. */
  function withReadOnly(def: FormDefinition, answers: AnswerMap, prefill: AnswerMap): AnswerMap {
    const out = { ...answers };
    for (const f of topLevelFields(def)) if (f.readOnly && f.prefill) out[f.id] = prefill[f.id] ?? null;
    return out;
  }

  const toDto = (s: SubmissionRec, includePersonal: boolean): Submission => ({
    id: s.id,
    eventId: s.eventId,
    linkId: s.linkId ?? "",
    definitionVersion: s.definitionVersion,
    answers: includePersonal ? { ...s.answers, ...(s.personalAnswers ?? {}) } : s.answers,
    submittedAt: toIso(s.submittedAt),
    submittedBy: s.submittedByMasked,
    source: s.source,
    status: s.status,
    version: s.version,
  });

  /** Validates against the locked definition and prepares everything a write needs. */
  async function prepare(ctx: Ctx & { ev: EventRec }, rawAnswers: AnswerMap, locale: Locale, submissionId: string) {
    const def = await definitionOf(ctx.link);
    const prefill = await prefillFor(def, ctx.ev, locale);
    const result = validateAnswers(def, withReadOnly(def, rawAnswers, prefill));
    if (!result.ok) throw new ApiError("VALIDATION_FAILED", { fields: issuesToFieldMap(result.errors, locale) });

    const fileIds: string[] = [];
    const fileErrors: Record<string, string> = {};
    for (const f of topLevelFields(def)) {
      const v = result.clean[f.id];
      if (f.kind !== "file" || !Array.isArray(v)) continue;
      const ids = v.filter((x): x is string => typeof x === "string");
      const found = await links.attachmentsByIds(ids);
      const ok = ids.every((id) => found.some((a) => a.id === id && a.linkId === ctx.link.id && a.fieldId === f.id && (a.submissionId === null || a.submissionId === submissionId)));
      if (!ok) fileErrors[f.id] = loc({ en: "Attach the file again.", hi: "फ़ाइल दोबारा जोड़ें।" }, locale);
      fileIds.push(...ids);
    }
    if (Object.keys(fileErrors).length) throw new ApiError("VALIDATION_FAILED", { fields: fileErrors });

    const { answers, personal } = splitPersonal(def, result.clean);
    const facts = ctx.link.purpose === "report" ? kpiFactsFromAnswers(def, result.clean).map((f) => ({ kpiKey: f.key, dim: f.dim, value: f.value })) : [];
    const consents = consentsFor(def, result.clean, submissionId, ctx.ev.id, ctx.session.phoneHash);
    return { def, answers, personal: Object.keys(personal).length ? personal : null, facts, consents, fileIds };
  }

  function consentsFor(def: FormDefinition, clean: AnswerMap, submissionId: string, eventId: string, by: string | null): ConsentRec[] {
    const out: ConsentRec[] = [];
    for (const s of def.sections) {
      if (!s.personalData) continue;
      const add = (subjectRef: string, statement: string) =>
        out.push({ id: newId(), submissionId, eventId, subjectRef, purpose: s.id, statement, recordedByHash: by, givenAt: now() });
      for (const f of s.fields) {
        if (f.consent && clean[f.id] === true) add(s.id, f.label.en);
        if (f.kind !== "repeater" || !Array.isArray(clean[f.id])) continue;
        const consent = (f.fields ?? []).find((c) => c.consent);
        if (!consent) continue;
        (clean[f.id] as AnswerMap[]).forEach((row, i) => {
          if (row[consent.id] === true) add(`${f.id}.${i}`, consent.label.en);
        });
      }
    }
    return out;
  }

  async function requireLinkById(linkId: string): Promise<LinkRec> {
    const link = await links.linkById(linkId);
    if (!link) throw notFound();
    return link;
  }

  function toFormLink(l: LinkRec): FormLink {
    return {
      id: l.id,
      purpose: l.purpose,
      label: l.label,
      sentTo: l.sentToKind === "qr" ? "qr" : l.sentToKind === "phone" ? l.sentToMasked : null,
      state: linkState(l, now()),
      expiresAt: toIso(l.expiresAt),
      uses: l.uses,
      maxUses: l.maxUses,
      otpRequired: l.purpose === "report" || (l.purpose === "desk" && l.otpRequired),
      lastOpenedAt: l.lastOpenedAt ? toIso(l.lastOpenedAt) : null,
      url: urlOf(l),
    };
  }

  /** Event move + pending report approval for a received report (applied atomically by the repo). */
  function reportReceived(eventId: string, byLabel: string, channel: "portal" | "whatsapp" = "portal"): NonNullable<NewSubmissionWrite["eventStatus"]> {
    const at = now();
    return {
      from: ["planned", "awaiting_report"],
      to: "report_submitted",
      timeline: { status: "report_submitted", at, byRole: "samithi_coord", byLabel, channel },
      approval: {
        id: newId(),
        eventId,
        kind: "report",
        state: "pending",
        requestedAt: at,
        requestedBy: null,
        requestedByLabel: byLabel,
        requestChannel: channel,
        decidedBy: null,
        decidedAt: null,
        channel: null,
        reason: null,
        escalatedAt: null,
        selfApproved: false,
      },
    };
  }

  /** The report form version locked to the event (locks the seva type's published one on first use). */
  async function reportVersion(ev: EventRec) {
    let versionId = await links.eventFormVersionId(ev.id);
    if (!versionId) {
      const t = (await links.templates()).find((x) => x.active && x.purpose === "report" && x.sevaType === ev.sevaType);
      const v = t ? await links.publishedVersion(t.id) : null;
      versionId = v ? await links.lockEventFormVersion(ev.id, v.id) : null;
    }
    const version = versionId ? await links.versionById(versionId) : null;
    if (!version) throw new ApiError("CONFLICT", { message: MSG.noForm.en });
    return version;
  }

  async function afterReport(eventId: string) {
    try {
      await deps.onReportSubmitted(eventId);
    } catch (err) {
      console.error("[links] report notification failed", err instanceof Error ? err.message : err);
    }
  }

  async function sendLink(l: LinkRec, phone: string, lang: Locale) {
    const ev = await eventOf(l);
    const title = loc(i18n(ev.titleEn, ev.titleHi), lang);
    await deps.whatsapp.sendTemplate(phone, "form_link_sent", lang, [loc(PURPOSE_LABEL[l.purpose], lang), title, urlOf(l, lang)]);
  }

  return {
    async info(token, sessionToken) {
      const link = await byToken(token);
      const ev = await eventOf(link);
      const session = await sessionFor(link, sessionToken);
      const info = await infoOf(link, ev, !!session);
      if (info.state === "revoked" || info.state === "expired") throw gone(link, info);
      if (info.state === "used_up") {
        const reopen = link.purpose !== "public" && (session !== null || editableSub(await scopeExisting(link, null), ev));
        if (!reopen) throw gone(link, info);
      }
      await links.updateLink(link.id, { lastOpenedAt: now() });
      return info;
    },

    async sendOtp(token, rawPhone, locale): Promise<OtpSent> {
      const link = await byToken(token);
      const ev = await eventOf(link);
      if (link.purpose === "public") throw new ApiError("BAD_REQUEST");
      await assertUsable(link, ev, "existing", null);
      const phone = parsePhone(rawPhone, locale);
      if (link.purpose === "report" && !(await links.allowedPhone(link.eventId, phone.hash))) throw new ApiError("PHONE_NOT_LISTED");
      return sendOtp(otpDeps, { phone: phone.e164, phoneHash: phone.hash, purpose: "link", linkId: link.id }, locale);
    },

    async verify(token, rawPhone, code, locale) {
      const link = await byToken(token);
      const ev = await eventOf(link);
      if (link.purpose === "public") throw new ApiError("BAD_REQUEST");
      await assertUsable(link, ev, "existing", null);
      const phone = parsePhone(rawPhone, locale);
      await verifyOtp(otpDeps, { phoneHash: phone.hash, purpose: "link", linkId: link.id }, code, locale);
      if (link.purpose === "report" && !(await links.allowedPhone(link.eventId, phone.hash))) throw new ApiError("PHONE_NOT_LISTED");
      return grant(link, phone);
    },

    async startPublic(token, input) {
      const link = await byToken(token);
      const ev = await eventOf(link);
      const allowed = link.purpose === "public" || (link.purpose === "desk" && !link.otpRequired);
      if (!allowed) throw new ApiError("BAD_REQUEST");
      await assertUsable(link, ev, link.purpose === "public" ? "new" : "existing", null);
      if (input.website) return null;
      if (!verifyBotChallenge(deps.secret, link.id, input.botToken, now())) throw new ApiError("FORBIDDEN");
      return grant(link, null);
    },

    async form(token, sessionToken, locale): Promise<FormPayload> {
      const ctx = await requireSession(token, sessionToken, "existing");
      const def = await definitionOf(ctx.link);
      const existing = await scopeExisting(ctx.link, ctx.session.id);
      const st = linkState(ctx.link, now());
      return {
        purpose: ctx.link.purpose,
        event: await card(ctx.ev),
        definition: def,
        prefill: await prefillFor(def, ctx.ev, locale),
        existing: existing ? toDto(existing, true) : null,
        editable: existing
          ? editableSub(existing, ctx.ev)
          : st === "active" && (ctx.link.purpose === "public" ? SIGNUP_OPEN : REPORTABLE).includes(ctx.ev.status),
      };
    },

    async submit(token, sessionToken, idempotencyKey, rawAnswers, locale) {
      const link = await byToken(token);
      const replay = await links.submissionByIdempotencyKey(idempotencyKey);
      if (replay) {
        // A retry from the offline queue: answer as before even if that submission used the link up.
        if (replay.linkId !== link.id) throw new ApiError("CONFLICT");
        if (!(await sessionFor(link, sessionToken))) throw new ApiError("UNAUTHENTICATED");
        return { submission: toDto(replay, true), replayed: true };
      }
      const ctx = await requireSession(token, sessionToken, "new");
      const open = ctx.link.purpose === "public" ? SIGNUP_OPEN : REPORTABLE;
      if (!open.includes(ctx.ev.status)) throw new ApiError("CONFLICT", { message: loc(MSG.closed, locale) });
      if (ctx.link.purpose !== "public" && (await scopeExisting(ctx.link, ctx.session.id))) {
        throw new ApiError("CONFLICT", { message: loc(MSG.alreadySent, locale) });
      }

      const id = newId();
      const p = await prepare(ctx, rawAnswers, locale, id);
      const rec: SubmissionRec = {
        id,
        eventId: ctx.ev.id,
        linkId: ctx.link.id,
        sessionId: ctx.session.id,
        formVersionId: p.def.id,
        definitionVersion: p.def.version,
        answers: p.answers,
        personalAnswers: p.personal,
        submittedByHash: ctx.session.phoneHash,
        submittedByMasked: ctx.session.phoneMasked ?? "",
        source: "form",
        status: "submitted",
        idempotencyKey,
        version: 1,
        submittedAt: now(),
        approvedAt: null,
      };
      const isReport = ctx.link.purpose === "report";
      const allowed = isReport && ctx.session.phoneHash ? await links.allowedPhone(ctx.ev.id, ctx.session.phoneHash) : null;
      const result = await links.createSubmission({
        submission: rec,
        facts: p.facts,
        consents: p.consents,
        attachmentIds: p.fileIds,
        linkId: ctx.link.id,
        eventStatus: isReport ? reportReceived(ctx.ev.id, allowed?.label ?? rec.submittedByMasked) : null,
        volunteersJoinedDelta: ctx.link.purpose === "public" ? 1 : 0,
      });
      if (result === "used_up") throw gone(ctx.link, await infoOf({ ...ctx.link, uses: ctx.link.maxUses ?? ctx.link.uses }, ctx.ev, false));
      if (result === "duplicate_key") {
        const again = await links.submissionByIdempotencyKey(idempotencyKey);
        if (!again || again.linkId !== ctx.link.id) throw new ApiError("CONFLICT");
        return { submission: toDto(again, true), replayed: true };
      }
      deps.revalidate(isReport ? ["events", "home"] : ["events"]);
      if (isReport) await afterReport(ctx.ev.id);
      return { submission: toDto(rec, true), replayed: false };
    },

    async update(token, sessionToken, id, patch, locale) {
      const ctx = await requireSession(token, sessionToken, "existing");
      const existing = await scopeExisting(ctx.link, ctx.session.id);
      if (!existing || existing.id !== id) throw notFound();
      if (!editableSub(existing, ctx.ev)) throw new ApiError("CONFLICT", { message: loc(MSG.approved, locale) });
      if (existing.version !== patch.version) throw new ApiError("CONFLICT");
      const p = await prepare(ctx, patch.answers, locale, id);
      const res = await links.updateSubmission({
        id,
        expectedVersion: patch.version,
        answers: p.answers,
        personalAnswers: p.personal,
        status: "submitted",
        facts: ctx.link.purpose === "report" ? p.facts : null,
        consents: p.consents,
        attachmentIds: p.fileIds,
        eventId: ctx.ev.id,
        // Corrections after "request changes" go back to the district.
        eventStatus: ctx.link.purpose === "report" ? { ...reportReceived(ctx.ev.id, existing.submittedByMasked), from: ["awaiting_report"] } : null,
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      if (ctx.link.purpose === "report" && ctx.ev.status === "awaiting_report") await afterReport(ctx.ev.id);
      const updated = await links.submissionById(id);
      if (!updated) throw notFound();
      return toDto(updated, true);
    },

    async attach(token, sessionToken, file, fieldId, idempotencyKey, locale): Promise<LinkAttachment> {
      const ctx = await requireSession(token, sessionToken, "existing");
      const toDtoA = (a: AttachmentRec): LinkAttachment => ({
        id: a.id,
        fieldId: a.fieldId ?? "",
        name: a.originalName,
        mime: a.mime,
        size: a.size,
        uploadedAt: toIso(a.createdAt),
      });
      if (idempotencyKey) {
        const prior = await links.attachmentByIdempotencyKey(ctx.link.id, idempotencyKey);
        if (prior) return toDtoA(prior);
      }
      const def = await definitionOf(ctx.link);
      if (!topLevelFields(def).some((f) => f.id === fieldId && f.kind === "file")) {
        throw new ApiError("VALIDATION_FAILED", { fields: { fieldId: loc(MSG.fileField, locale) } });
      }
      if (file.bytes.byteLength > ATTACHMENT_LIMITS.maxBytes) throw new ApiError("VALIDATION_FAILED", { fields: { file: loc(MSG.fileSize, locale) } });
      const kind = sniffMime(file.bytes);
      if (!kind || !(ATTACHMENT_LIMITS.mimes as readonly string[]).includes(kind.mime)) {
        throw new ApiError("VALIDATION_FAILED", { fields: { file: loc(MSG.fileType, locale) } });
      }
      const id = newId();
      const rel = `events/${ctx.ev.id}/${id}.${kind.ext}`;
      await deps.storage.put(rel, file.bytes);
      const rec: AttachmentRec = {
        id,
        eventId: ctx.ev.id,
        linkId: ctx.link.id,
        submissionId: null,
        fieldId,
        path: rel,
        originalName: file.name.replace(/[\\/\0]/g, "_").slice(0, 200) || `${fieldId}.${kind.ext}`,
        mime: kind.mime,
        size: file.bytes.byteLength,
        sha256: createHash("sha256").update(file.bytes).digest("hex"),
        uploadedByHash: ctx.session.phoneHash,
        idempotencyKey,
        retentionUntil: new Date(ctx.ev.startsAt.getTime() + ATTACHMENT_RETENTION_MS),
        createdAt: now(),
      };
      await links.insertAttachment(rec);
      return toDtoA(rec);
    },

    async reportContext(eventId, locale) {
      const ev = await repo.eventById(eventId);
      if (!ev) throw notFound();
      const version = await reportVersion(ev);
      return { definition: version.definition, prefill: await prefillFor(version.definition, ev, locale) };
    },

    async submitExternal(input) {
      const ev = await repo.eventById(input.eventId);
      if (!ev) throw notFound();
      if (ev.status !== "planned" && ev.status !== "awaiting_report") {
        throw new ApiError("CONFLICT", { message: loc(ev.status === "report_submitted" || ev.status === "escalated" ? MSG.alreadySent : MSG.closed, input.locale) });
      }
      const version = await reportVersion(ev);
      const def = version.definition;
      const prefill = await prefillFor(def, ev, input.locale);
      const result = validateAnswers(def, withReadOnly(def, input.answers, prefill));
      if (!result.ok) throw new ApiError("VALIDATION_FAILED", { fields: issuesToFieldMap(result.errors, input.locale) });
      const { answers, personal } = splitPersonal(def, result.clean);
      const id = newId();
      const reportLink = (await links.linksForEvent(ev.id)).find((l) => l.purpose === "report") ?? null;
      const rec: SubmissionRec = {
        id,
        eventId: ev.id,
        linkId: reportLink?.id ?? null,
        sessionId: null,
        formVersionId: def.id,
        definitionVersion: def.version,
        answers,
        personalAnswers: Object.keys(personal).length ? personal : null,
        submittedByHash: input.byHash,
        submittedByMasked: input.byMasked,
        source: input.source,
        status: "submitted",
        idempotencyKey: input.idempotencyKey ?? null,
        version: 1,
        submittedAt: now(),
        approvedAt: null,
      };
      const res = await links.createSubmission({
        submission: rec,
        facts: kpiFactsFromAnswers(def, result.clean).map((f) => ({ kpiKey: f.key, dim: f.dim, value: f.value })),
        consents: [],
        attachmentIds: [],
        linkId: rec.linkId,
        eventStatus: reportReceived(ev.id, input.byLabel, input.source === "whatsapp" ? "whatsapp" : "portal"),
        volunteersJoinedDelta: 0,
      });
      if (res !== "ok") throw new ApiError("CONFLICT");
      deps.revalidate(["events", "home"]);
      await afterReport(ev.id);
      return toDto(rec, false);
    },

    // ---- Portal helpers (M3 adds RBAC around these) -------------------------

    async createLink(eventId, purpose, opts: NewLinkOptions = {}) {
      const ev = await repo.eventById(eventId);
      if (!ev) throw notFound();
      const templates = (await links.templates()).filter((t) => t.active && t.purpose === (purpose === "public" ? "public" : "report"));
      let versionId: string | null = null;
      if (purpose === "public") {
        const t = templates[0];
        versionId = t ? ((await links.publishedVersion(t.id))?.id ?? null) : null;
      } else {
        versionId = await links.eventFormVersionId(eventId);
        if (!versionId) {
          const t = templates.find((x) => x.sevaType === ev.sevaType);
          const v = t ? await links.publishedVersion(t.id) : null;
          versionId = v ? await links.lockEventFormVersion(eventId, v.id) : null;
        }
      }
      if (!versionId) throw new ApiError("CONFLICT", { message: MSG.noForm.en });

      const phone = opts.sendTo && opts.sendTo !== "qr" ? normalisePhone(opts.sendTo) : null;
      if (opts.sendTo && opts.sendTo !== "qr" && !phone) throw new ApiError("VALIDATION_FAILED", { fields: { sendTo: MSG.phone.en } });
      const existing = await links.linksForEvent(eventId);
      const defs = await loadLinkDefaults(repo);
      const base = ev.endsAt ?? ev.startsAt;
      const defaultExpiry = new Date(
        purpose === "report"
          ? base.getTime() + defs.reportLinkDays * DAY
          : purpose === "desk"
            ? ev.startsAt.getTime() + (defs.deskLink === "event_day_plus_1" ? 2 : 1) * DAY
            : ev.startsAt.getTime(),
      );
      const nonce = newLinkNonce();
      const token = deriveLinkToken(deps.secret, nonce);
      const rec: LinkRec = {
        id: newId(),
        tokenHash: hashLinkToken(token),
        tokenNonce: nonce,
        eventId,
        purpose,
        label:
          opts.label ??
          (purpose === "report" ? "Report" : purpose === "desk" ? `Desk ${existing.filter((l) => l.purpose === "desk").length + 1}` : "Join this seva"),
        formVersionId: versionId,
        sentToKind: phone ? "phone" : opts.sendTo === "qr" ? "qr" : null,
        sentToEnc: phone ? encryptField(deps.secret, phone) : null,
        sentToHash: phone ? phoneHash(deps.secret, phone) : null,
        sentToMasked: phone ? maskPhone(phone) : null,
        expiresAt: opts.expiresAt ?? defaultExpiry,
        maxUses: opts.maxUses ?? null,
        uses: 0,
        revokedAt: null,
        otpRequired: purpose === "report" ? true : (opts.otpRequired ?? false),
        createdBy: opts.createdBy ?? null,
        lastOpenedAt: null,
        version: 1,
      };
      await links.insertLink(rec);
      if (phone && purpose === "report") {
        await links.addAllowedPhone({ id: newId(), eventId, phoneHash: rec.sentToHash ?? "", phoneEnc: rec.sentToEnc ?? "", phoneMasked: rec.sentToMasked ?? "", label: opts.recipientLabel ?? null });
      }
      if (phone && opts.send) await sendLink(rec, phone, opts.lang ?? "en");
      return { link: toFormLink(rec), token };
    },

    async addAllowedPhone(eventId, rawPhone, label) {
      const e164 = normalisePhone(rawPhone);
      if (!e164) throw new ApiError("VALIDATION_FAILED", { fields: { phone: MSG.phone.en } });
      await links.addAllowedPhone({ id: newId(), eventId, phoneHash: phoneHash(deps.secret, e164), phoneEnc: encryptField(deps.secret, e164), phoneMasked: maskPhone(e164), label });
    },

    async revokeLink(linkId) {
      const l = await requireLinkById(linkId);
      if (!l.revokedAt) await links.updateLink(l.id, { revokedAt: now() });
      return toFormLink({ ...l, revokedAt: l.revokedAt ?? now() });
    },

    async extendLink(linkId, until) {
      const l = await requireLinkById(linkId);
      if (until <= now()) throw new ApiError("VALIDATION_FAILED", { fields: { expiresAt: MSG.past.en } });
      await links.updateLink(l.id, { expiresAt: until });
      return toFormLink({ ...l, expiresAt: until });
    },

    async listLinksForEvent(eventId) {
      return (await links.linksForEvent(eventId)).map(toFormLink);
    },

    async resendLink(linkId, lang = "en") {
      const l = await requireLinkById(linkId);
      if (linkState(l, now()) !== "active") throw new ApiError("CONFLICT", { message: MSG.notActive.en });
      const phone = l.sentToEnc ? decryptField(deps.secret, l.sentToEnc) : null;
      if (!phone) throw new ApiError("CONFLICT", { message: MSG.noPhone.en });
      await sendLink(l, phone, lang);
      return toFormLink(l);
    },

    linkUrl: urlOf,
    describe: toFormLink,
  };
}
