// Portal events (§5.4 Events, specs 25–27): scoped list with tab counts,
// event detail, plan/edit, lifecycle actions and bulk link resend.
import {
  type AdminEventsMeta,
  type AdminEventsQuery,
  type EventAction,
  type EventActionBody,
  type EventAdmin,
  type EventFromMessage,
  type EventInputParsed,
  type EventPatch,
  type EventRow,
  EventStatus,
  type I18nText,
  type Locale,
  type PrivateAttachment,
  type SubmissionSummary,
  type TimelineStep,
} from "@/contract";
import { newId } from "../../db/columns";
import { auditRec, diff } from "../../audit";
import { type Actor, assertCan, can, inScope } from "../../auth/rbac";
import { EDITABLE_STATUSES, effectiveStatus, type LifecycleAction } from "../../domain/event-lifecycle";
import { istDayStart, addDays, toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { AdminEventFilter, EventPatchRec } from "../../repo/portal-types";
import type { EventRec } from "../../repo/types";
import { assembleEvents, buildResults } from "../event-assembler";
import type { OrgIndex } from "../org-index";
import { eventFromMessage } from "./event-from-message";
import { transition } from "./lifecycle";
import { eventInScope, loadOrg, type PortalCtx, scopeSamithiIds, toEventRow } from "./shared";

const MSG = {
  samithi: { en: "Choose a samithi in your area.", hi: "अपने क्षेत्र की समिति चुनें।" },
  partner: { en: "Choose a partner from the list.", hi: "सूची से साझेदार चुनें।" },
  ends: { en: "The end must be after the start.", hi: "समाप्ति प्रारंभ के बाद होनी चाहिए।" },
  descEn: { en: "Add the description in English.", hi: "अंग्रेज़ी में विवरण जोड़ें।" },
  descHi: { en: "Add the description in Hindi.", hi: "हिंदी में विवरण जोड़ें।" },
  locked: { en: "This event can no longer be edited.", hi: "यह कार्यक्रम अब बदला नहीं जा सकता।" },
} satisfies Record<string, I18nText>;

const t = (m: I18nText, l: Locale) => (l === "hi" ? m.hi : null) ?? m.en;

export interface AdminEventsService {
  list(actor: Actor, q: AdminEventsQuery): Promise<{ data: EventRow[]; meta: AdminEventsMeta }>;
  get(actor: Actor, id: string): Promise<EventAdmin>;
  create(actor: Actor, input: EventInputParsed, locale: Locale): Promise<EventAdmin>;
  patch(actor: Actor, id: string, patch: EventPatch, locale: Locale): Promise<EventAdmin>;
  act(actor: Actor, id: string, action: EventAction, body: EventActionBody, locale?: Locale): Promise<EventAdmin>;
  /** Plan event prefill from a forwarded WhatsApp message; saves nothing. */
  fromMessage(actor: Actor, text: string): Promise<EventFromMessage>;
}

/** Bilingual description (and Hindi title) are required before an event leaves draft (spec 27). */
function bilingualErrors(ev: Pick<EventRec, "descriptionEn" | "descriptionHi">, locale: Locale): Record<string, string> {
  const f: Record<string, string> = {};
  if (!ev.descriptionEn?.trim()) f["description.en"] = t(MSG.descEn, locale);
  if (!ev.descriptionHi?.trim()) f["description.hi"] = t(MSG.descHi, locale);
  return f;
}

export function createAdminEventsService(ctx: PortalCtx): AdminEventsService {
  const { repo, deps } = ctx;

  async function filterFor(actor: Actor, q: AdminEventsQuery, org: OrgIndex): Promise<Omit<AdminEventFilter, "sort" | "limit" | "offset" | "statuses">> {
    const now = deps.now();
    return {
      samithiIds: scopeSamithiIds(actor, org),
      from: q.from ? istDayStart(q.from) : undefined,
      to: q.to ? istDayStart(addDays(q.to, 1)) : undefined,
      sevaType: q.sevaType,
      districtId: q.district,
      samithiId: q.samithi,
      source: q.source,
      overdueBefore: q.overdue ? now : undefined,
    };
  }

  async function timelineOf(ev: EventRec): Promise<TimelineStep[]> {
    const rows = await repo.portal.timelineFor([ev.id]);
    return rows
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0))
      .map((r) => ({
        status: r.status,
        at: toIsoOrNull(r.at),
        by: r.byRole && r.byLabel ? { role: r.byRole, label: r.byLabel } : null,
        channel: r.channel,
      }));
  }

  async function toAdmin(actor: Actor, ev: EventRec): Promise<EventAdmin> {
    const org = await loadOrg(repo);
    const now = deps.now();
    // Public DTO of the same record with a public-looking status (results computed below).
    const [pub] = await assembleEvents(repo, org, [{ ...ev, status: "planned" }]);
    const [timeline, links, subs, attachments, facts, creator] = await Promise.all([
      timelineOf(ev),
      ctx.links.listLinksForEvent(ev.id),
      repo.portal.submissionsForEvent(ev.id),
      repo.portal.attachmentsForEvent(ev.id),
      repo.portal.factsForEvents([ev.id]),
      ev.createdBy ? repo.portal.userById(ev.createdBy) : Promise.resolve(null),
    ]);
    const linkLabel = new Map(links.map((l) => [l.id, l.label]));
    const submissions: SubmissionSummary[] = subs.map((s) => ({
      id: s.id,
      linkLabel: (s.linkId && linkLabel.get(s.linkId)) || "Portal",
      submittedAt: toIso(s.submittedAt),
      submittedBy: s.submittedByMasked,
      source: s.source,
      status: s.status,
    }));
    const files: PrivateAttachment[] = attachments.map((a) => ({
      id: a.id,
      name: a.originalName,
      mime: a.mime,
      size: a.size,
      uploadedAt: toIso(a.createdAt),
      url: `/api/v1/admin/attachments/${a.id}`,
    }));
    // Results preview: what the public page shows once approved (pending facts counted as approved).
    const preview = facts.length ? buildResults(ev, facts.map((f) => ({ ...f, approvedAt: f.approvedAt ?? now }))) : null;
    const followUp =
      ev.sevaType === "eye" && can(actor, "followup.read")
        ? subs.reduce((n, s) => n + Object.values(s.personalAnswers ?? {}).reduce<number>((m, v) => m + (Array.isArray(v) ? v.length : 0), 0), 0)
        : null;
    return {
      ...pub,
      status: ev.status,
      postponedTo: toIsoOrNull(ev.postponedTo),
      results: preview,
      source: ev.source,
      createdBy: creator ? { id: creator.id, label: creator.name } : null,
      timeline,
      links,
      submissions,
      attachments: files,
      followUpCount: followUp,
      reportDueAt: toIsoOrNull(ev.reportDueAt),
      version: ev.version,
    };
  }

  async function assertSamithi(actor: Actor, samithiId: string, locale: Locale, org: OrgIndex) {
    const u = org.get(samithiId);
    if (!u || u.kind !== "samithi" || !u.active || !inScope(actor, u.id)) {
      throw new ApiError("VALIDATION_FAILED", { fields: { samithiId: t(MSG.samithi, locale) } });
    }
    return u;
  }

  async function assertPartner(partnerId: string | null | undefined, locale: Locale) {
    if (!partnerId) return;
    const [p] = await repo.partners([partnerId]);
    if (!p || !p.active) throw new ApiError("VALIDATION_FAILED", { fields: { partnerId: t(MSG.partner, locale) } });
  }

  /** submit → self-approve when the planner can approve in this scope (district/state). */
  function lifecycleAction(actor: Actor, action: EventAction): LifecycleAction {
    return action === "submit" && can(actor, "events.approve") ? "self-approve" : action;
  }

  const service: AdminEventsService = {
    async list(actor, q) {
      assertCan(actor, "events.read");
      const org = await loadOrg(repo);
      const base = await filterFor(actor, q, org);
      const status = q.status && q.status !== "all" ? EventStatus.parse(q.status) : undefined;
      const [page, counts] = await Promise.all([
        repo.portal.listAdminEvents({
          ...base,
          statuses: status ? [status] : undefined,
          sort: q.sort ?? "-startsAt",
          limit: q.pageSize,
          offset: (q.page - 1) * q.pageSize,
        }),
        repo.portal.eventStatusCounts(base),
      ]);
      const now = deps.now();
      const countObj: Record<string, number> = { all: 0 };
      for (const s of EventStatus.options) {
        countObj[s] = counts.get(s) ?? 0;
        countObj.all += countObj[s];
      }
      return {
        data: page.rows.map((e) => toEventRow(e, org, now)),
        meta: { page: q.page, pageSize: q.pageSize, total: page.total, counts: countObj },
      };
    },

    fromMessage: (actor, text) => eventFromMessage(ctx, actor, text),

    async get(actor, id) {
      assertCan(actor, "events.read");
      return toAdmin(actor, await eventInScope(ctx, actor, id));
    },

    async create(actor, input, locale) {
      assertCan(actor, "events.plan");
      const org = await loadOrg(repo);
      const samithi = await assertSamithi(actor, input.samithiId, locale, org);
      await assertPartner(input.partnerId, locale);
      const startsAt = new Date(input.startsAt);
      const endsAt = input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && endsAt <= startsAt) throw new ApiError("VALIDATION_FAILED", { fields: { endsAt: t(MSG.ends, locale) } });
      const descriptionHi = input.description.hi?.trim() || null;
      if (input.submit) {
        const errs = bilingualErrors({ descriptionEn: input.description.en, descriptionHi }, locale);
        if (Object.keys(errs).length) throw new ApiError("VALIDATION_FAILED", { fields: errs });
      }
      const at = deps.now();
      const ev: EventRec = {
        id: newId(),
        sevaType: input.sevaType,
        status: "draft",
        titleEn: input.title.en,
        titleHi: input.title.hi?.trim() || null,
        descriptionEn: input.description.en.trim() || null,
        descriptionHi,
        startsAt,
        endsAt,
        postponedTo: null,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        venueLat: input.geo?.lat ?? null,
        venueLng: input.geo?.lng ?? null,
        samithiId: samithi.id,
        districtId: org.districtIdOf(samithi.id) ?? samithi.parentId ?? samithi.id,
        centreId: null,
        partnerId: input.partnerId,
        volunteersNeeded: input.volunteersNeeded,
        volunteersJoined: 0,
        bring: input.bring.map((b) => ({ en: b.en, hi: b.hi?.trim() || null })),
        resultsPhotos: [],
        recurring: input.recurring,
        source: "portal",
        createdBy: actor.userId,
        reportDueAt: null,
        approvedAt: null,
        approvalRequestedAt: null,
        escalatedAt: null,
        escalatedFrom: null,
        selfApproved: false,
        version: 1,
        updatedAt: at,
      };
      await repo.portal.insertEvent({
        event: ev,
        timeline: [{ status: "draft", at, byRole: actor.role, byLabel: actor.name, byUserId: actor.userId, channel: "portal", note: null }],
        approval: null,
        audit: [auditRec(actor, { action: "event.create", entity: "event", entityId: ev.id, scopeId: ev.samithiId, data: { title: ev.titleEn, sevaType: ev.sevaType, startsAt: toIso(startsAt) } })],
      });
      if (input.submit) {
        await transition(ctx, ev, { action: lifecycleAction(actor, "submit"), by: actor, channel: "portal" });
      }
      return service.get(actor, ev.id);
    },

    async patch(actor, id, body, locale) {
      assertCan(actor, "events.plan");
      const ev = await eventInScope(ctx, actor, id);
      if (!EDITABLE_STATUSES.includes(effectiveStatus(ev))) throw new ApiError("CONFLICT", { message: t(MSG.locked, locale) });
      if (ev.version !== body.version) throw new ApiError("CONFLICT");
      const org = await loadOrg(repo);
      const patch: EventPatchRec = {};
      if (body.samithiId && body.samithiId !== ev.samithiId) {
        const s = await assertSamithi(actor, body.samithiId, locale, org);
        patch.samithiId = s.id;
        patch.districtId = org.districtIdOf(s.id) ?? s.parentId ?? s.id;
      }
      if (body.partnerId !== undefined) {
        await assertPartner(body.partnerId, locale);
        patch.partnerId = body.partnerId;
      }
      if (body.sevaType) patch.sevaType = body.sevaType;
      if (body.title) Object.assign(patch, { titleEn: body.title.en, titleHi: body.title.hi?.trim() || null });
      if (body.description) Object.assign(patch, { descriptionEn: body.description.en.trim() || null, descriptionHi: body.description.hi?.trim() || null });
      if (body.startsAt) patch.startsAt = new Date(body.startsAt);
      if (body.endsAt !== undefined) patch.endsAt = body.endsAt ? new Date(body.endsAt) : null;
      if (body.venueName !== undefined) patch.venueName = body.venueName;
      if (body.venueAddress !== undefined) patch.venueAddress = body.venueAddress;
      if (body.geo !== undefined) Object.assign(patch, { venueLat: body.geo?.lat ?? null, venueLng: body.geo?.lng ?? null });
      if (body.volunteersNeeded !== undefined) patch.volunteersNeeded = body.volunteersNeeded;
      if (body.bring) patch.bring = body.bring.map((b) => ({ en: b.en, hi: b.hi?.trim() || null }));
      if (body.recurring !== undefined) patch.recurring = body.recurring;

      const merged = { ...ev, ...patch };
      if (merged.endsAt && merged.endsAt <= merged.startsAt) throw new ApiError("VALIDATION_FAILED", { fields: { endsAt: t(MSG.ends, locale) } });
      if (ev.status !== "draft") {
        const errs = bilingualErrors(merged, locale);
        if (Object.keys(errs).length) throw new ApiError("VALIDATION_FAILED", { fields: errs });
      }
      const changes = diff(ev, patch);
      const res = await repo.portal.writeEvent({
        eventId: ev.id,
        at: deps.now(),
        expectVersion: body.version,
        patch,
        timeline: [],
        audit: [
          auditRec(actor, {
            action: "event.update",
            entity: "event",
            entityId: ev.id,
            scopeId: merged.samithiId,
            data: JSON.parse(JSON.stringify(changes)) as Record<string, unknown>,
          }),
        ],
      });
      if (res === "conflict") throw new ApiError("CONFLICT");
      if (ev.status === "planned" || ev.status === "postponed") deps.revalidate(["events", "home", "centres"]);
      return service.get(actor, ev.id);
    },

    async act(actor, id, action, body, locale = "en") {
      // Permission first (403 reveals nothing), then scope (404).
      if (action === "reopen") assertCan(actor, "events.reopen");
      else if (action === "approve-plan" || action === "approve-report" || action === "request-changes") assertCan(actor, "events.approve");
      else assertCan(actor, "events.plan");
      const ev = await eventInScope(ctx, actor, id);
      if (ev.status === "escalated" && action !== "cancel") assertCan(actor, "approvals.escalated");
      if (body.version !== undefined && body.version !== ev.version) throw new ApiError("CONFLICT");
      if (action === "submit") {
        const errs = bilingualErrors(ev, locale);
        if (Object.keys(errs).length) throw new ApiError("VALIDATION_FAILED", { fields: errs });
      }
      await transition(ctx, ev, {
        action: lifecycleAction(actor, action),
        by: actor,
        channel: "portal",
        expectVersion: body.version,
        reason: body.reason ?? null,
        postponedTo: body.postponedTo ? new Date(body.postponedTo) : null,
      });
      return service.get(actor, ev.id);
    },
  };
  return service;
}
