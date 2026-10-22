// Event lifecycle (spec README "Event lifecycle status pills"):
// draft → awaiting_approval → planned → awaiting_report → report_submitted → approved,
// with changes-requested loops, cancel/postpone, escalation to the state team and reopen.
import type { ApprovalKind, EventAction, EventStatus } from "@/contract";
import { ApiError } from "../http/errors";

/** Portal actions plus the transitions made by jobs and the form-link flow. */
export type LifecycleAction = EventAction | "self-approve" | "escalate" | "event-passed" | "report-received";

export interface LifecycleState {
  status: EventStatus;
  /** Set while escalated: the status it was escalated from. */
  escalatedFrom: EventStatus | null;
}

/** Where an escalated event really is (awaiting_approval or report_submitted). */
export const effectiveStatus = (s: LifecycleState): EventStatus => (s.status === "escalated" && s.escalatedFrom ? s.escalatedFrom : s.status);

type Rule = Partial<Record<EventStatus, EventStatus>>;

/** `from` keys use the effective status; escalated events resolve like their origin. */
const RULES: Record<LifecycleAction, Rule> = {
  submit: { draft: "awaiting_approval" },
  "self-approve": { draft: "planned", awaiting_approval: "planned" },
  "approve-plan": { awaiting_approval: "planned" },
  "approve-report": { report_submitted: "approved" },
  "request-changes": { awaiting_approval: "draft", report_submitted: "awaiting_report" },
  cancel: { draft: "cancelled", awaiting_approval: "cancelled", planned: "cancelled", postponed: "cancelled" },
  postpone: { planned: "postponed" },
  reopen: { approved: "report_submitted", cancelled: "draft", postponed: "planned" },
  escalate: { awaiting_approval: "escalated", report_submitted: "escalated" },
  "event-passed": { planned: "awaiting_report" },
  "report-received": { planned: "report_submitted", awaiting_report: "report_submitted" },
};

/** Statuses that can be escalated must not be escalated twice. */
const NOT_FROM_ESCALATED: ReadonlySet<LifecycleAction> = new Set(["escalate", "submit", "self-approve"]);

/** Next status, or null when the action is not allowed from here. */
export function nextStatus(action: LifecycleAction, s: LifecycleState): EventStatus | null {
  if (s.status === "escalated" && NOT_FROM_ESCALATED.has(action)) return null;
  return RULES[action][effectiveStatus(s)] ?? null;
}

const LABEL: Record<LifecycleAction, string> = {
  submit: "submit",
  "self-approve": "approve",
  "approve-plan": "approve the plan of",
  "approve-report": "approve the report of",
  "request-changes": "request changes on",
  cancel: "cancel",
  postpone: "postpone",
  reopen: "reopen",
  escalate: "escalate",
  "event-passed": "close",
  "report-received": "receive a report for",
};

/** Next status or 409 CONFLICT with a readable reason. */
export function assertTransition(action: LifecycleAction, s: LifecycleState): EventStatus {
  const next = nextStatus(action, s);
  if (!next) {
    throw new ApiError("CONFLICT", { message: `You can't ${LABEL[action]} an event that is ${s.status.replace(/_/g, " ")}.` });
  }
  return next;
}

/** Which approval an action decides (plan or report), from the event's effective status. */
export function approvalKindFor(s: LifecycleState): ApprovalKind | null {
  const st = effectiveStatus(s);
  if (st === "awaiting_approval") return "plan";
  if (st === "report_submitted") return "report";
  return null;
}

/** Plan fields can be edited until the event happens (checked on the effective status). */
export const EDITABLE_STATUSES: readonly EventStatus[] = ["draft", "awaiting_approval", "planned", "postponed"];

/** Form links may be issued once the plan is approved (spec 26), checked on the effective status. */
export const LINKABLE_STATUSES: readonly EventStatus[] = ["planned", "awaiting_report", "report_submitted", "postponed"];
