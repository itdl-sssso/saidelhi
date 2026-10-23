// Cron jobs (§1 Jobs, spec 50 flows 3–4). Each is idempotent: status moves are
// guarded by the lifecycle, messages by notification_log keys (at most once).
import type { CronJob, JobResult } from "@/contract";
import type { SystemActor } from "../../audit";
import { approvalKindFor } from "../../domain/event-lifecycle";
import { addDays, istDate, istDayStart, toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { PersonRec } from "../../repo/portal-types";
import type { EventRec } from "../../repo/types";
import { decryptField } from "../../security/crypto";
import { linkState } from "../../security/link-token";
import type { ReminderRuleRec } from "../../repo/wa-types";
import { loadReminderRules } from "../wa/rules";
import { transition } from "./lifecycle";
import { DAY_MS, escalationSettings, fmtDate, holders, notify, type PortalCtx, portalUrl } from "./shared";

export interface JobsService {
  run(job: CronJob, requestId?: string | null): Promise<JobResult>;
}

export function createJobsService(ctx: PortalCtx): JobsService {
  const { repo, deps } = ctx;

  /** Transition that tolerates a concurrent change (another run got there first). */
  async function tryMove(ev: EventRec, action: "escalate" | "event-passed", by: SystemActor) {
    try {
      return await transition(ctx, ev, { action, by, channel: "system" });
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") return null;
      throw err;
    }
  }

  /** Admin-controlled reminder rules (spec 42); all on until someone switches one off. */
  async function rules(): Promise<Map<ReminderRuleRec["key"], ReminderRuleRec>> {
    return new Map((await loadReminderRules(repo.wa)).map((r) => [r.key, r]));
  }

  async function escalations(by: SystemActor, out: JobResult) {
    const now = deps.now();
    const s = await escalationSettings(repo);
    const reminderOn = (await rules()).get("approval_day2")?.enabled !== false;
    for (const a of await repo.portal.approvals({ states: ["pending"] })) {
      const ev = await repo.eventById(a.eventId);
      if (!ev || approvalKindFor(ev) !== a.kind || ev.status === "escalated") continue;
      const age = now.getTime() - a.requestedAt.getTime();
      if (age >= s.approvalDays * DAY_MS) {
        const moved = await tryMove(ev, "escalate", by);
        if (moved) {
          out.changed++;
          out.notified += moved.notified;
          out.ids.push(ev.id);
        }
      } else if (reminderOn && age >= s.reminderDay * DAY_MS && (await repo.portal.claimNotification(`approval-reminder:${a.id}`, "approval_reminder", ev.id, now))) {
        const coords = await holders(ctx, "district_coord", ev.districtId);
        const title = (l: "en" | "hi") => (l === "hi" ? ev.titleHi : null) ?? ev.titleEn;
        out.notified +=
          a.kind === "plan"
            ? await notify(ctx, coords, "plan_approval_request", (l) => [title(l), fmtDate(ev.startsAt, l), ev.venueName], ev.id)
            : await notify(ctx, coords, "report_approval_request", (l) => [title(l), portalUrl(ctx, `/events/${ev.id}`)], ev.id);
        out.ids.push(ev.id);
      }
    }
  }

  async function eventStatus(by: SystemActor, out: JobResult) {
    const today = istDayStart(istDate(deps.now()));
    const { rows } = await repo.portal.listAdminEvents({ statuses: ["planned"], to: today, sort: "startsAt", limit: 10_000, offset: 0 });
    for (const ev of rows) {
      const moved = await tryMove(ev, "event-passed", by);
      if (moved) {
        out.changed++;
        out.ids.push(ev.id);
      }
    }
  }

  async function reportRecipients(ev: EventRec): Promise<{ people: PersonRec[]; direct: string | null; url: string }> {
    const now = deps.now();
    const report = (await repo.links.linksForEvent(ev.id)).find((l) => l.purpose === "report" && linkState(l, now) === "active");
    const url = report ? ctx.links.linkUrl(report) : portalUrl(ctx, `/events/${ev.id}`);
    const direct = report?.sentToEnc ? decryptField(deps.secret, report.sentToEnc) : null;
    return { people: direct ? [] : await holders(ctx, "samithi_coord", ev.samithiId), direct, url };
  }

  /** day_after_no_report, plus3_no_report, plus7_no_report for the configured reminder days (1, 3, 7 by default). */
  const RULE_BY_STAGE: ReminderRuleRec["key"][] = ["day_after_no_report", "plus3_no_report", "plus7_no_report"];

  async function reportReminders(out: JobResult) {
    const now = deps.now();
    const s = await escalationSettings(repo);
    const ruleMap = await rules();
    const today = istDayStart(istDate(now)).getTime();
    const { rows } = await repo.portal.listAdminEvents({ statuses: ["awaiting_report"], sort: "startsAt", limit: 10_000, offset: 0 });
    const ruleFor = (day: number) => ruleMap.get(RULE_BY_STAGE[Math.min(s.reportReminderDays.indexOf(day), RULE_BY_STAGE.length - 1)]);
    for (const ev of rows) {
      const daysAfter = Math.floor((today - istDayStart(istDate(ev.startsAt)).getTime()) / DAY_MS);
      const due = s.reportReminderDays.filter((d) => daysAfter >= d);
      // Every due stage is recorded, so re-enabling a rule later never replays old reminders.
      const claimed: number[] = [];
      for (const d of due) if (await repo.portal.claimNotification(`report-reminder:${ev.id}:${d}`, "report_reminder", ev.id, now)) claimed.push(d);
      const live = claimed.filter((d) => ruleFor(d)?.enabled !== false);
      if (live.length === 0) continue;
      const stage = Math.max(...live);
      const r = await reportRecipients(ev);
      const title = (l: "en" | "hi") => (l === "hi" ? ev.titleHi : null) ?? ev.titleEn;
      if (r.direct) {
        try {
          await deps.whatsapp.sendTemplate(r.direct, "report_reminder", "en", [title("en"), r.url]);
          out.notified++;
        } catch (err) {
          console.error("[jobs] report reminder failed", err instanceof Error ? err.message : err);
        }
      }
      out.notified += await notify(ctx, r.people, "report_reminder", (l) => [title(l), r.url]);
      if (ruleFor(stage)?.copyDistrict ?? stage === s.reportReminderDays[s.reportReminderDays.length - 1]) {
        out.notified += await notify(ctx, await holders(ctx, "district_coord", ev.districtId), "report_reminder", (l) => [title(l), portalUrl(ctx, `/events/${ev.id}`)]);
      }
      out.ids.push(ev.id);
    }
  }

  /** The day before a planned event: checklist reminder to the samithi coordinator (district when none). */
  async function dayBefore(out: JobResult) {
    if ((await rules()).get("day_before")?.enabled === false) return;
    const now = deps.now();
    const tomorrow = addDays(istDate(now), 1);
    const { rows } = await repo.portal.listAdminEvents({
      statuses: ["planned"],
      from: istDayStart(tomorrow),
      to: istDayStart(addDays(tomorrow, 1)),
      sort: "startsAt",
      limit: 10_000,
      offset: 0,
    });
    for (const ev of rows) {
      if (!(await repo.portal.claimNotification(`day-before:${ev.id}`, "event_reminder_day_before", ev.id, now))) continue;
      let people = await holders(ctx, "samithi_coord", ev.samithiId);
      if (people.length === 0) people = await holders(ctx, "district_coord", ev.districtId);
      const title = (l: "en" | "hi") => (l === "hi" ? ev.titleHi : null) ?? ev.titleEn;
      const time = (l: "en" | "hi") =>
        new Intl.DateTimeFormat(l === "hi" ? "hi-IN" : "en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(ev.startsAt);
      out.notified += await notify(ctx, people, "event_reminder_day_before", (l) => [title(l), time(l)]);
      out.ids.push(ev.id);
    }
  }

  return {
    async run(job, requestId = null) {
      const by: SystemActor = { kind: "system", requestId };
      const out: JobResult = { job, at: toIso(deps.now()), changed: 0, notified: 0, ids: [] };
      if (job === "escalations") await escalations(by, out);
      else if (job === "event-status") await eventStatus(by, out);
      else if (job === "reminders") {
        await dayBefore(out);
        await reportReminders(out);
      } else await reportReminders(out);
      out.ids = [...new Set(out.ids)];
      return out;
    },
  };
}
