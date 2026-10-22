// What a signed-in role can do to an event in its current status (mirrors src/server/domain/event-lifecycle.ts).
// The server re-checks every action; this only decides which controls to show (hidden, never disabled).
import type { EventAction, EventAdmin, EventStatus, Permission } from "@/contract";

export const LINKABLE: readonly EventStatus[] = ["planned", "awaiting_report", "report_submitted", "postponed"];
export const EDITABLE: readonly EventStatus[] = ["draft", "awaiting_approval", "planned", "postponed"];

/** Where an escalated event really sits: it was a report if a report-submitted step was recorded. */
export function effectiveStatus(ev: Pick<EventAdmin, "status" | "timeline">): EventStatus {
  if (ev.status !== "escalated") return ev.status;
  return ev.timeline.some((s) => s.status === "report_submitted" && s.at) ? "report_submitted" : "awaiting_approval";
}

export interface EventControls {
  /** Decision/submit actions in display order; the first is the primary button. */
  actions: Array<Extract<EventAction, "submit" | "approve-plan" | "approve-report" | "request-changes" | "reopen">>;
  edit: boolean;
  postpone: boolean;
  cancel: boolean;
  /** "Send form links" / "Resend report link": links exist or may be issued. */
  sendLinks: boolean;
  linksOpen: boolean;
}

export function controlsFor(ev: Pick<EventAdmin, "status" | "timeline">, perms: readonly Permission[]): EventControls {
  const has = (p: Permission) => perms.includes(p);
  const eff = effectiveStatus(ev);
  const escalatedOk = ev.status !== "escalated" || has("approvals.escalated");
  const actions: EventControls["actions"] = [];
  if (eff === "draft" && has("events.plan")) actions.push("submit");
  if (eff === "awaiting_approval" && has("events.approve") && escalatedOk) actions.push("approve-plan", "request-changes");
  if (eff === "report_submitted" && has("events.approve") && escalatedOk) actions.push("approve-report", "request-changes");
  if (["approved", "cancelled", "postponed"].includes(ev.status) && has("events.reopen")) actions.push("reopen");
  return {
    actions,
    edit: has("events.plan") && EDITABLE.includes(eff),
    postpone: has("events.plan") && ev.status === "planned",
    cancel: has("events.plan") && ["draft", "awaiting_approval", "planned", "postponed"].includes(eff),
    sendLinks: has("links.manage") && LINKABLE.includes(ev.status) && ev.status !== "report_submitted",
    linksOpen: LINKABLE.includes(ev.status),
  };
}

/** Public event page exists for planned-or-later statuses (spec 09). */
export const hasPublicPage = (s: EventStatus) => ["planned", "awaiting_report", "report_submitted", "approved", "cancelled", "postponed"].includes(s);
