// Shared plumbing for the portal services: dependencies, scope helpers,
// settings, DTO builders and WhatsApp notifications to coordinators.
import type { EventRow, I18nText, Locale, Role } from "@/contract";
import type { Actor } from "../../auth/rbac";
import { assertInScope } from "../../auth/rbac";
import { toIso, toIsoOrNull } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { EmailProvider } from "../../providers/email";
import type { TemplateName } from "../../providers/whatsapp/templates";
import type { PersonRec } from "../../repo/portal-types";
import type { DataRepo, EventRec } from "../../repo/types";
import { decryptField } from "../../security/crypto";
import { i18n, type OrgIndex } from "../org-index";
import { loadOrg } from "../shared";
import type { LinkServiceDeps, LinksService } from "../types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface PortalDeps extends LinkServiceDeps {
  email: EmailProvider;
}

export interface PortalCtx {
  repo: DataRepo;
  deps: PortalDeps;
  links: LinksService;
}

export interface EscalationSettings {
  /** Pending approvals pass to the state team after this many days. */
  approvalDays: number;
  /** Day of the reminder to the district before escalation. */
  reminderDay: number;
  /** Report due this many days after the event day. */
  reportDueDays: number;
  /** Report reminders on these days after the event (the last one copies the district). */
  reportReminderDays: number[];
}

export const DEFAULT_ESCALATION: EscalationSettings = { approvalDays: 3, reminderDay: 2, reportDueDays: 3, reportReminderDays: [1, 3, 7] };

const posInt = (v: unknown, fallback: number) => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : fallback);

export async function escalationSettings(repo: DataRepo): Promise<EscalationSettings> {
  const raw = (await repo.settings(["escalation"])).get("escalation");
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const days = Array.isArray(o.reportReminderDays) ? o.reportReminderDays.filter((d): d is number => typeof d === "number" && d > 0) : [];
  return {
    approvalDays: posInt(o.approvalDays, DEFAULT_ESCALATION.approvalDays),
    reminderDay: posInt(o.reminderDay, DEFAULT_ESCALATION.reminderDay),
    reportDueDays: posInt(o.reportDueDays, DEFAULT_ESCALATION.reportDueDays),
    reportReminderDays: days.length ? [...days].sort((a, b) => a - b) : DEFAULT_ESCALATION.reportReminderDays,
  };
}

/** Loads an event the actor may see; anything else is 404. */
export async function eventInScope(ctx: PortalCtx, actor: Actor, id: string): Promise<EventRec> {
  const ev = await ctx.repo.eventById(id);
  if (!ev) throw new ApiError("NOT_FOUND");
  assertInScope(actor, ev.samithiId);
  return ev;
}

/** Samithi ids in the actor's scope, or undefined for NCR-wide actors. */
export function scopeSamithiIds(actor: Actor, org: OrgIndex): string[] | undefined {
  if (actor.all) return undefined;
  return [...actor.unitIds].filter((id) => org.get(id)?.kind === "samithi");
}

export function overdueDays(ev: EventRec, now: Date): number | null {
  if (ev.status !== "awaiting_report" || !ev.reportDueAt || ev.reportDueAt >= now) return null;
  return Math.max(1, Math.ceil((now.getTime() - ev.reportDueAt.getTime()) / DAY_MS));
}

export function toEventRow(ev: EventRec, org: OrgIndex, now: Date): EventRow {
  return {
    id: ev.id,
    title: i18n(ev.titleEn, ev.titleHi),
    sevaType: ev.sevaType,
    status: ev.status,
    startsAt: toIso(ev.startsAt),
    endsAt: toIsoOrNull(ev.endsAt),
    postponedTo: toIsoOrNull(ev.postponedTo),
    venueName: ev.venueName,
    samithi: org.ref(ev.samithiId),
    district: org.ref(ev.districtId),
    source: ev.source,
    reportDueAt: toIsoOrNull(ev.reportDueAt),
    overdueDays: overdueDays(ev, now),
    lastActivityAt: toIso(ev.updatedAt),
    selfApproved: ev.selfApproved,
    version: ev.version,
  };
}

export const loc = (t: I18nText, locale: Locale) => (locale === "hi" ? t.hi : null) ?? t.en;

/** '17 Oct 2026' (IST). */
export function fmtDate(d: Date, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}

export function portalUrl(ctx: PortalCtx, path: string): string {
  return `${ctx.deps.appUrl.replace(/\/$/, "")}/admin${path}`;
}

export { loadOrg };

/** Active (or invited) people holding `role` exactly at `unitId`; any unit when null. */
export async function holders(ctx: PortalCtx, role: Role, unitId: string | null): Promise<PersonRec[]> {
  const people = await ctx.repo.portal.people();
  return people.filter((p) => p.role?.role === role && p.user.status !== "deactivated" && (unitId === null || p.role.scopeId === unitId));
}

/** Sends a template to people; failures are logged, never thrown (the change already happened). */
export async function notify(ctx: PortalCtx, people: readonly PersonRec[], template: TemplateName, params: (locale: Locale) => string[], buttonRef?: string): Promise<number> {
  let sent = 0;
  for (const p of people) {
    const phone = decryptField(ctx.deps.secret, p.user.phoneEnc);
    if (!phone) continue;
    try {
      await ctx.deps.whatsapp.sendTemplate(phone, template, p.user.locale, params(p.user.locale), buttonRef ? { buttonRef } : undefined);
      sent++;
    } catch (err) {
      console.error(`[portal] WhatsApp ${template} to user ${p.user.id} failed`, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

/** Paginates an in-memory list. */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number) {
  return { data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } };
}
