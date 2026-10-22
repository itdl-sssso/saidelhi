// Approvals (spec 29): plan/report/escalated cards with escalation countdown,
// and bulk approval of plans.
import type { ApprovalCard, ApprovalsMeta, ApprovalsQuery, ApprovalsTab, BulkResult, ErrorCode, KeyNumber } from "@/contract";
import { type Actor, assertCan, inScope } from "../../auth/rbac";
import { kpiDef, resultLayout } from "../../domain/kpi";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { ApprovalRec } from "../../repo/portal-types";
import type { EventRec, KpiFactRec } from "../../repo/types";
import type { AdminEventsService } from "./events";
import { DAY_MS, escalationSettings, loadOrg, pageOf, type PortalCtx, scopeSamithiIds, toEventRow } from "./shared";

export interface ApprovalsService {
  list(actor: Actor, q: ApprovalsQuery): Promise<{ data: ApprovalCard[]; meta: ApprovalsMeta }>;
  bulkApprove(actor: Actor, ids: readonly string[]): Promise<BulkResult>;
}

const tabOf = (a: ApprovalRec): ApprovalsTab | null =>
  a.state === "escalated" ? "escalated" : a.state === "pending" ? (a.kind === "plan" ? "plans" : "reports") : null;

function keyNumbers(ev: EventRec, facts: readonly KpiFactRec[]): KeyNumber[] {
  const keys = [...resultLayout(ev.sevaType).tiles, "volunteer_hours"].filter((k, i, all) => all.indexOf(k) === i);
  return keys.map((key) => {
    const vals = facts.filter((f) => f.kpiKey === key && f.dim === "" && f.value !== null).map((f) => f.value as number);
    return { key, label: kpiDef(key)?.label ?? { en: key, hi: null }, value: vals.length ? vals.reduce((a, b) => a + b, 0) : null };
  });
}

export function createApprovalsService(ctx: PortalCtx, events: AdminEventsService): ApprovalsService {
  const { repo, deps } = ctx;

  /** Open approvals in scope whose event is still waiting on that decision. */
  async function open(actor: Actor) {
    const org = await loadOrg(repo);
    const { rows } = await repo.portal.listAdminEvents({
      samithiIds: scopeSamithiIds(actor, org),
      statuses: ["awaiting_approval", "report_submitted", "escalated"],
      sort: "startsAt",
      limit: 10_000,
      offset: 0,
    });
    const byId = new Map(rows.map((e) => [e.id, e]));
    const approvals = (await repo.portal.approvals({ states: ["pending", "escalated"], eventIds: [...byId.keys()] })).filter((a) => {
      const ev = byId.get(a.eventId);
      if (!ev) return false;
      const waitingOn = (ev.status === "escalated" ? ev.escalatedFrom : ev.status) === "awaiting_approval" ? "plan" : "report";
      return a.kind === waitingOn && (a.state === "escalated") === (ev.status === "escalated");
    });
    return { org, byId, approvals };
  }

  return {
    async list(actor, q) {
      assertCan(actor, "approvals.read");
      const tab = q.tab ?? "plans";
      const { org, byId, approvals } = await open(actor);
      const counts: Record<ApprovalsTab, number> = { plans: 0, reports: 0, escalated: 0 };
      for (const a of approvals) {
        const t = tabOf(a);
        if (t) counts[t]++;
      }
      const rows = approvals.filter((a) => tabOf(a) === tab).sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
      const page = pageOf(rows, q.page, q.pageSize);
      const reportIds = page.data.filter((a) => a.kind === "report").map((a) => a.eventId);
      const facts = await repo.portal.factsForEvents(reportIds);
      const settings = await escalationSettings(repo);
      const now = deps.now();
      const data = page.data.map((a): ApprovalCard => {
        const ev = byId.get(a.eventId) as EventRec;
        return {
          id: a.id,
          kind: a.kind,
          state: a.state,
          event: toEventRow(ev, org, now),
          requestedAt: toIso(a.requestedAt),
          requestedBy: a.requestedByLabel ? { label: a.requestedByLabel, phone: a.requestedByLabel.startsWith("+") ? a.requestedByLabel : null } : null,
          channel: a.requestChannel,
          waitingDays: Math.max(0, Math.floor((now.getTime() - a.requestedAt.getTime()) / DAY_MS)),
          escalatesAt: a.state === "pending" ? toIso(new Date(a.requestedAt.getTime() + settings.approvalDays * DAY_MS)) : null,
          keyNumbers: a.kind === "report" ? keyNumbers(ev, facts.filter((f) => f.eventId === ev.id)) : [],
        };
      });
      return { data, meta: { ...page.meta, counts } };
    },

    async bulkApprove(actor, ids) {
      assertCan(actor, "approvals.decide");
      assertCan(actor, "events.approve");
      const all = await repo.portal.approvals({ states: ["pending", "escalated"] });
      const done: string[] = [];
      const failed: BulkResult["failed"] = [];
      const fail = (id: string, code: ErrorCode, message: string) => failed.push({ id, code, message });
      for (const id of [...new Set(ids)]) {
        const a = all.find((x) => x.id === id);
        const ev = a ? await repo.eventById(a.eventId) : null;
        if (!a || !ev || !inScope(actor, ev.samithiId)) {
          fail(id, "NOT_FOUND", "We couldn't find that.");
          continue;
        }
        if (a.kind !== "plan") {
          fail(id, "BAD_REQUEST", "Reports are approved one at a time.");
          continue;
        }
        try {
          await events.act(actor, ev.id, "approve-plan", {});
          done.push(id);
        } catch (err) {
          if (!(err instanceof ApiError)) throw err;
          fail(id, err.code, err.customMessage ?? err.code);
        }
      }
      return { done, failed };
    },
  };
}
