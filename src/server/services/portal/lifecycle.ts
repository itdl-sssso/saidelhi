// Applies a lifecycle transition atomically (event + timeline + approval +
// facts + audit), then runs its side effects: form links, WhatsApp notices and
// public cache revalidation.
import type { ApprovalKind, FormLink, TimelineChannel } from "@/contract";
import { newId } from "../../db/columns";
import { type AuditActor, auditRec } from "../../audit";
import { ROLE_LABEL } from "../../auth/rbac";
import { approvalKindFor, assertTransition, effectiveStatus, type LifecycleAction } from "../../domain/event-lifecycle";
import { kpiDef, resultLayout } from "../../domain/kpi";
import { ApiError } from "../../http/errors";
import type { ApprovalRec, EventWrite, TimelineWrite } from "../../repo/portal-types";
import type { EventRec } from "../../repo/types";
import { decryptField } from "../../security/crypto";
import type { CacheTag } from "../../cache";
import { DAY_MS, escalationSettings, fmtDate, holders, loc, notify, type PortalCtx, portalUrl } from "./shared";

export interface TransitionInput {
  action: LifecycleAction;
  by: AuditActor;
  channel: TimelineChannel;
  expectVersion?: number;
  reason?: string | null;
  postponedTo?: Date | null;
}

export interface TransitionResult {
  event: EventRec;
  links: FormLink[];
  notified: number;
}

const isUser = (a: AuditActor): a is Exclude<AuditActor, { kind: string }> => !("kind" in a);

const PUBLIC_TAGS: readonly CacheTag[] = ["events", "home", "centres"];

function step(by: AuditActor, status: TimelineWrite["status"], at: Date, channel: TimelineChannel, note: string | null = null): TimelineWrite {
  return isUser(by)
    ? { status, at, byRole: by.role, byLabel: by.name, byUserId: by.userId, channel, note }
    : { status, at, byRole: null, byLabel: null, byUserId: null, channel: "system", note };
}

export async function transition(ctx: PortalCtx, ev: EventRec, input: TransitionInput): Promise<TransitionResult> {
  const { repo, deps } = ctx;
  const at = deps.now();
  const next = assertTransition(input.action, ev);
  const userId = isUser(input.by) ? input.by.userId : null;
  const kind: ApprovalKind | null = approvalKindFor(ev);
  const w: EventWrite = {
    eventId: ev.id,
    at,
    expectVersion: input.expectVersion,
    expectStatuses: [ev.status],
    patch: { status: next },
    timeline: [step(input.by, next, at, input.channel, input.reason ?? null)],
    audit: [],
  };
  if (ev.status === "escalated" && input.action !== "escalate") Object.assign(w.patch, { escalatedFrom: null, escalatedAt: null });

  const decide = (state: ApprovalRec["state"], k: ApprovalKind | null) => {
    w.approvalUpdate = {
      kind: k ?? undefined,
      fromStates: ["pending", "escalated"],
      set: { state, decidedBy: userId, decidedAt: at, channel: input.channel, reason: input.reason ?? null },
    };
  };
  const newApproval = (k: ApprovalKind, state: ApprovalRec["state"], self = false): ApprovalRec => ({
    id: newId(),
    eventId: ev.id,
    kind: k,
    state,
    requestedAt: at,
    requestedBy: userId,
    requestedByLabel: isUser(input.by) ? input.by.name : null,
    requestChannel: input.channel,
    decidedBy: state === "pending" ? null : userId,
    decidedAt: state === "pending" ? null : at,
    channel: state === "pending" ? null : input.channel,
    reason: null,
    escalatedAt: null,
    selfApproved: self,
  });

  switch (input.action) {
    case "submit":
      w.patch.approvalRequestedAt = at;
      w.approvalInsert = newApproval("plan", "pending");
      break;
    case "self-approve":
      w.patch.selfApproved = true;
      w.patch.approvalRequestedAt = at;
      if (ev.status === "awaiting_approval") decide("approved", "plan");
      else w.approvalInsert = newApproval("plan", "approved", true);
      w.timeline[0].note = "Self-approved by the district";
      break;
    case "approve-plan":
      decide("approved", "plan");
      break;
    case "approve-report":
      decide("approved", "report");
      w.patch.approvedAt = at;
      w.facts = { op: "approve", at };
      w.submissions = { status: "approved", approvedAt: at };
      break;
    case "request-changes":
      if (!input.reason) throw new ApiError("VALIDATION_FAILED", { fields: { reason: "Say what needs to change." } });
      decide("changes_requested", kind);
      if (kind === "report") w.submissions = { status: "changes_requested", approvedAt: null };
      break;
    case "cancel":
      decide("changes_requested", null);
      if (w.approvalUpdate) w.approvalUpdate.set.reason = input.reason ?? "Event cancelled";
      break;
    case "postpone":
      w.patch.postponedTo = input.postponedTo ?? null;
      break;
    case "reopen":
      if (ev.status === "approved") {
        w.patch.approvedAt = null;
        w.facts = { op: "unapprove" };
        w.submissions = { status: "submitted", approvedAt: null };
        w.approvalInsert = newApproval("report", "pending");
      } else if (ev.status === "postponed") {
        const to = ev.postponedTo ?? ev.startsAt;
        const shift = to.getTime() - ev.startsAt.getTime();
        w.patch.startsAt = to;
        w.patch.endsAt = ev.endsAt ? new Date(ev.endsAt.getTime() + shift) : null;
        w.patch.postponedTo = null;
      }
      break;
    case "escalate":
      w.patch.escalatedFrom = ev.status;
      w.patch.escalatedAt = at;
      w.approvalUpdate = { kind: kind ?? undefined, fromStates: ["pending"], set: { state: "escalated", escalatedAt: at } };
      break;
    case "event-passed": {
      const s = await escalationSettings(repo);
      if (!ev.reportDueAt) w.patch.reportDueAt = new Date(ev.startsAt.getTime() + s.reportDueDays * DAY_MS);
      w.timeline.unshift(step(input.by, "event_day", ev.startsAt, "system"));
      break;
    }
    case "report-received":
      break;
  }

  w.audit.push(
    auditRec(input.by, {
      action: `event.${input.action}`,
      entity: "event",
      entityId: ev.id,
      scopeId: ev.samithiId,
      data: { from: ev.status, to: next, ...(input.reason ? { reason: input.reason } : {}), ...(w.patch.postponedTo ? { postponedTo: w.patch.postponedTo.toISOString() } : {}) },
    }),
  );

  if ((await repo.portal.writeEvent(w)) === "conflict") throw new ApiError("CONFLICT");
  const updated = (await repo.eventById(ev.id)) ?? ev;
  const result: TransitionResult = { event: updated, links: [], notified: 0 };
  await sideEffects(ctx, ev, updated, input, result);
  return result;
}

async function sideEffects(ctx: PortalCtx, before: EventRec, ev: EventRec, input: TransitionInput, out: TransitionResult) {
  const { deps } = ctx;
  const title = (l: "en" | "hi") => (l === "hi" ? ev.titleHi : null) ?? ev.titleEn;
  switch (input.action) {
    case "submit": {
      const coords = await holders(ctx, "district_coord", ev.districtId);
      out.notified += await notify(ctx, coords, "plan_approval_request", (l) => [title(l), fmtDate(ev.startsAt, l), ev.venueName], ev.id);
      break;
    }
    case "self-approve":
    case "approve-plan":
      out.links = await ensureLinks(ctx, ev, input.by);
      deps.revalidate(PUBLIC_TAGS);
      break;
    case "approve-report":
      deps.revalidate([...PUBLIC_TAGS, "impact"]);
      break;
    case "escalate": {
      const admins = await holders(ctx, "state_admin", null);
      const unit = (await ctx.repo.orgUnits()).find((u) => u.id === ev.districtId);
      const where = unit ? ` (${unit.nameEn})` : "";
      out.notified += await notify(ctx, admins, "escalation_notice", (l) => [`${title(l)}${where}`, portalUrl(ctx, "/approvals?tab=escalated")]);
      break;
    }
    case "cancel":
    case "postpone":
    case "reopen":
    case "event-passed":
      if (before.status !== "draft" && before.status !== "awaiting_approval") {
        deps.revalidate(before.status === "approved" ? [...PUBLIC_TAGS, "impact"] : PUBLIC_TAGS);
      }
      break;
    default:
      break;
  }
}

/** Who receives the report link: the planner if they coordinate the samithi, else its coordinators. */
async function reportRecipient(ctx: PortalCtx, ev: EventRec): Promise<{ phone: string; name: string; locale: "en" | "hi" } | null> {
  const coords = await holders(ctx, "samithi_coord", ev.samithiId);
  const pick = coords.find((p) => p.user.id === ev.createdBy) ?? coords[0];
  if (!pick) return null;
  const phone = decryptField(ctx.deps.secret, pick.user.phoneEnc);
  return phone ? { phone, name: pick.user.name, locale: pick.user.locale } : null;
}

/** Report (sent on WhatsApp), desk (QR) and public sign-up links, unless active ones exist. */
export async function ensureLinks(ctx: PortalCtx, ev: EventRec, by: AuditActor): Promise<FormLink[]> {
  const existing = (await ctx.links.listLinksForEvent(ev.id)).filter((l) => l.state === "active");
  const has = (p: FormLink["purpose"]) => existing.some((l) => l.purpose === p);
  const createdBy = isUser(by) ? by.userId : undefined;
  const made: FormLink[] = [];
  const recipient = await reportRecipient(ctx, ev);
  const plan: { purpose: FormLink["purpose"]; opts: Parameters<PortalCtx["links"]["createLink"]>[2] }[] = [];
  if (!has("report")) {
    plan.push({
      purpose: "report",
      opts: recipient ? { sendTo: recipient.phone, recipientLabel: recipient.name, send: true, lang: recipient.locale, createdBy } : { createdBy },
    });
  }
  if (!has("desk")) plan.push({ purpose: "desk", opts: { sendTo: "qr", otpRequired: false, createdBy } });
  if (!has("public")) plan.push({ purpose: "public", opts: { sendTo: "qr", createdBy } });
  const audit = [];
  for (const p of plan) {
    try {
      const { link } = await ctx.links.createLink(ev.id, p.purpose, p.opts);
      made.push(link);
      audit.push(auditRec(by, { action: "link.create", entity: "form_link", entityId: link.id, scopeId: ev.samithiId, data: { eventId: ev.id, purpose: link.purpose, label: link.label, sentTo: link.sentTo } }));
    } catch (err) {
      // No published form for this seva type yet (pilot: eye and blood only): skip report/desk links.
      if (err instanceof ApiError && err.code === "CONFLICT") continue;
      if (err instanceof ApiError && err.code === "PROVIDER_UNAVAILABLE") continue;
      throw err;
    }
  }
  for (const a of audit) await ctx.repo.portal.insertAudit(a);
  return made;
}

/** Hook from the form-link flow: a report arrived → tell the district (approval row is opened atomically). */
export async function reportReceived(ctx: PortalCtx, eventId: string): Promise<void> {
  const ev = await ctx.repo.eventById(eventId);
  if (!ev || effectiveStatus(ev) !== "report_submitted") return;
  const facts = await ctx.repo.portal.factsForEvents([eventId]);
  const keys = resultLayout(ev.sevaType).tiles;
  const summary = (l: "en" | "hi") =>
    keys
      .map((k) => {
        const vals = facts.filter((f) => f.kpiKey === k && f.dim === "" && f.value !== null).map((f) => f.value as number);
        const def = kpiDef(k);
        return vals.length && def ? `${loc(def.label, l)} ${vals.reduce((a, b) => a + b, 0)}` : null;
      })
      .filter(Boolean)
      .join(", ") || "-";
  const coords = await holders(ctx, "district_coord", ev.districtId);
  await notify(ctx, coords, "report_approval_request", (l) => [(l === "hi" ? ev.titleHi : null) ?? ev.titleEn, summary(l)], eventId);
  await ctx.repo.portal.insertAudit(
    auditRec({ kind: "public" }, { action: "event.report-received", entity: "event", entityId: ev.id, scopeId: ev.samithiId, data: { to: "report_submitted" } }),
  );
}

export const roleLabel = (role: keyof typeof ROLE_LABEL, l: "en" | "hi") => ROLE_LABEL[role][l];
