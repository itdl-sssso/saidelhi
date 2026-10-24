// Form links admin (spec 32, spec 26 links panel): scoped list, issue, resend,
// extend, revoke and the printable QR poster. Wraps the M2 link helpers with RBAC + audit.
import type { AdminLinksMeta, AdminLinksQuery, BulkResendResult, FormLink, FormLinkAdmin, LinkCreate, Locale } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan, inScope } from "../../auth/rbac";
import { effectiveStatus, LINKABLE_STATUSES } from "../../domain/event-lifecycle";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { LinkRec } from "../../repo/links-types";
import type { EventRec } from "../../repo/types";
import { linkState } from "../../security/link-token";
import { i18n } from "../org-index";
import { qrPosterPdf } from "./qr-poster";
import { DAY_MS, eventInScope, fmtDate, loadOrg, pageOf, type PortalCtx, scopeSamithiIds } from "./shared";

export interface AdminLinksService {
  list(actor: Actor, q: AdminLinksQuery): Promise<{ data: FormLinkAdmin[]; meta: AdminLinksMeta }>;
  create(actor: Actor, eventId: string, body: LinkCreate): Promise<FormLinkAdmin>;
  resend(actor: Actor, linkId: string, lang?: Locale): Promise<FormLinkAdmin>;
  extend(actor: Actor, linkId: string, until: Date): Promise<FormLinkAdmin>;
  revoke(actor: Actor, linkId: string): Promise<FormLinkAdmin>;
  qrPdf(actor: Actor, linkId: string): Promise<{ bytes: Uint8Array; filename: string }>;
  bulkResend(actor: Actor, eventIds: readonly string[]): Promise<BulkResendResult>;
}

const EXPIRING_MS = 2 * DAY_MS;

const HEADINGS: Record<FormLink["purpose"], string> = {
  report: "Report form",
  desk: "Desk entry form",
  public: "Join this seva",
};

const INSTRUCTIONS: Record<FormLink["purpose"], string> = {
  report: "Scan with your phone camera to open the report form. You will be asked for your phone number and a code.",
  desk: "Scan with your phone camera to open the desk form.",
  public: "Scan with your phone camera to sign up as Sevadal.",
};

export function createAdminLinksService(ctx: PortalCtx): AdminLinksService {
  const { repo, deps } = ctx;

  async function linkInScope(actor: Actor, linkId: string): Promise<{ link: LinkRec; ev: EventRec }> {
    const link = await repo.links.linkById(linkId);
    const ev = link ? await repo.eventById(link.eventId) : null;
    if (!link || !ev || !inScope(actor, ev.samithiId)) throw new ApiError("NOT_FOUND");
    return { link, ev };
  }

  async function toAdmin(rec: LinkRec & { createdAt?: Date }, ev: EventRec): Promise<FormLinkAdmin> {
    const org = await loadOrg(repo);
    const dto = ctx.links.describe(rec);
    const now = deps.now();
    return {
      ...dto,
      event: { id: ev.id, title: i18n(ev.titleEn, ev.titleHi), startsAt: toIso(ev.startsAt), status: ev.status, samithi: org.ref(ev.samithiId), district: org.ref(ev.districtId) },
      createdAt: toIso(rec.createdAt ?? ev.updatedAt),
      expiringSoon: dto.state === "active" && rec.expiresAt.getTime() - now.getTime() < EXPIRING_MS,
    };
  }

  async function fresh(linkId: string, ev: EventRec): Promise<FormLinkAdmin> {
    const [rec] = (await repo.portal.linksForEvents([ev.id])).filter((l) => l.id === linkId);
    if (!rec) throw new ApiError("NOT_FOUND");
    return toAdmin(rec, ev);
  }

  const audit = (actor: Actor, action: string, link: LinkRec, ev: EventRec, data: Record<string, unknown> = {}) =>
    repo.portal.insertAudit(
      auditRec(actor, { action, entity: "form_link", entityId: link.id, scopeId: ev.samithiId, data: { eventId: ev.id, purpose: link.purpose, label: link.label, ...data } }),
    );

  const service: AdminLinksService = {
    async list(actor, q) {
      assertCan(actor, "links.read");
      const org = await loadOrg(repo);
      const { rows: events } = await repo.portal.listAdminEvents({
        samithiIds: scopeSamithiIds(actor, org),
        districtId: q.district,
        sort: "-startsAt",
        limit: 100_000,
        offset: 0,
      });
      const evById = new Map(events.filter((e) => !q.event || e.id === q.event).map((e) => [e.id, e]));
      const now = deps.now();
      const links = (await repo.portal.linksForEvents([...evById.keys()])).filter((l) => !q.purpose || l.purpose === q.purpose);
      const soon = (l: LinkRec) => linkState(l, now) === "active" && l.expiresAt.getTime() - now.getTime() < EXPIRING_MS;
      const rows = links.filter((l) => !q.state || (q.state === "expiring" ? soon(l) : linkState(l, now) === q.state));
      const page = pageOf(rows, q.page, q.pageSize);
      const data = await Promise.all(page.data.map((l) => toAdmin(l, evById.get(l.eventId) as EventRec)));
      return { data, meta: { ...page.meta, expiringSoon: links.filter(soon).length } };
    },

    async create(actor, eventId, body) {
      assertCan(actor, "links.manage");
      const ev = await eventInScope(ctx, actor, eventId);
      if (!LINKABLE_STATUSES.includes(effectiveStatus(ev))) {
        throw new ApiError("CONFLICT", { message: "Links are sent once the district approves the plan." });
      }
      const { link } = await ctx.links.createLink(ev.id, body.purpose, {
        label: body.label,
        sendTo: body.sendTo,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        maxUses: body.maxUses,
        otpRequired: body.otpRequired,
        createdBy: actor.userId,
        send: !!body.sendTo && body.sendTo !== "qr",
        lang: body.lang,
      });
      const rec = await repo.links.linkById(link.id);
      if (!rec) throw new ApiError("INTERNAL");
      await audit(actor, "link.create", rec, ev, { sentTo: link.sentTo, expiresAt: link.expiresAt });
      return fresh(link.id, ev);
    },

    async resend(actor, linkId, lang) {
      assertCan(actor, "links.manage");
      const { link, ev } = await linkInScope(actor, linkId);
      await ctx.links.resendLink(link.id, lang);
      await audit(actor, "link.resend", link, ev, { sentTo: link.sentToMasked });
      return fresh(link.id, ev);
    },

    async extend(actor, linkId, until) {
      assertCan(actor, "links.manage");
      const { link, ev } = await linkInScope(actor, linkId);
      await ctx.links.extendLink(link.id, until);
      await audit(actor, "link.extend", link, ev, { before: toIso(link.expiresAt), after: toIso(until) });
      return fresh(link.id, ev);
    },

    async revoke(actor, linkId) {
      assertCan(actor, "links.manage");
      const { link, ev } = await linkInScope(actor, linkId);
      await ctx.links.revokeLink(link.id);
      if (!link.revokedAt) await audit(actor, "link.revoke", link, ev);
      return fresh(link.id, ev);
    },

    async qrPdf(actor, linkId) {
      assertCan(actor, "links.read");
      const { link, ev } = await linkInScope(actor, linkId);
      const org = await loadOrg(repo);
      const bytes = await qrPosterPdf({
        url: ctx.links.linkUrl(link),
        heading: link.purpose === "desk" ? `${HEADINGS.desk} – ${link.label}` : HEADINGS[link.purpose],
        title: ev.titleEn,
        when: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(ev.startsAt),
        venue: [ev.venueName, ev.venueAddress, org.ref(ev.samithiId).name.en].filter(Boolean).join(", "),
        instructions: INSTRUCTIONS[link.purpose],
        footer: `This link works until ${fmtDate(link.expiresAt)}. Please don't post photos of this poster online.`,
      });
      await audit(actor, "link.qr", link, ev);
      return { bytes, filename: `qr-${link.purpose}-${ev.id.slice(-6).toLowerCase()}.pdf` };
    },

    async bulkResend(actor, eventIds) {
      assertCan(actor, "links.manage");
      const results: BulkResendResult["results"] = [];
      const now = deps.now();
      for (const eventId of [...new Set(eventIds)]) {
        const ev = await repo.eventById(eventId);
        if (!ev || !inScope(actor, ev.samithiId)) {
          results.push({ eventId, resent: 0, skipped: 0 });
          continue;
        }
        let resent = 0;
        let skipped = 0;
        for (const l of await repo.links.linksForEvent(ev.id)) {
          if (l.sentToKind !== "phone" || linkState(l, now) !== "active") {
            skipped++;
            continue;
          }
          try {
            await ctx.links.resendLink(l.id);
            await audit(actor, "link.resend", l, ev, { sentTo: l.sentToMasked, bulk: true });
            resent++;
          } catch (err) {
            if (!(err instanceof ApiError)) throw err;
            skipped++;
          }
        }
        results.push({ eventId, resent, skipped });
      }
      return { results };
    },
  };
  return service;
}
