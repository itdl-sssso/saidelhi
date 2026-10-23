// Volunteers (spec 43): events that asked for volunteers with sign-up counts, first names +
// masked phones on demand (audited), per-coordinator alert preference, and the alert itself.
import type { EventStatus, VolunteerEventRow, VolunteerNotifyBody, VolunteersMeta, VolunteerSignup, VolunteersQuery } from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { addDays, istDate, toIso } from "../../domain/time";
import { i18n } from "../org-index";
import { maskPhone, normalisePhone } from "../../security/phone";
import { DAY_MS, eventInScope, holders, loadOrg, notify, type PortalCtx, scopeSamithiIds } from "./shared";

export interface VolunteersService {
  list(actor: Actor, q: VolunteersQuery): Promise<{ data: VolunteerEventRow[]; meta: VolunteersMeta }>;
  signups(actor: Actor, eventId: string): Promise<VolunteerSignup[]>;
  setNotify(actor: Actor, body: VolunteerNotifyBody): Promise<VolunteerNotifyBody>;
  /** A new public sign-up arrived: alert opted-in coordinators of the samithi and its district. */
  onSignup(eventId: string): Promise<void>;
}

interface PrefData {
  notifyOnSignup?: boolean;
}

const STATUSES: EventStatus[] = ["planned", "postponed", "awaiting_report", "report_submitted", "approved"];

export function createVolunteersService(ctx: PortalCtx): VolunteersService {
  const { repo, deps } = ctx;

  async function notifyPref(userId: string): Promise<boolean> {
    return (await repo.m6.docGet<PrefData>("user_pref", userId))?.data.notifyOnSignup ?? false;
  }

  /** Public sign-up submissions of one event, oldest first. */
  async function signupsOf(eventId: string) {
    const publicLinks = new Set((await repo.links.linksForEvent(eventId)).filter((l) => l.purpose === "public").map((l) => l.id));
    return (await repo.portal.submissionsForEvent(eventId))
      .filter((s) => s.linkId && publicLinks.has(s.linkId))
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  return {
    async list(actor, q) {
      assertCan(actor, "volunteers.read");
      const org = await loadOrg(repo);
      const now = deps.now();
      const when = q.when ?? "next30";
      const res = await repo.portal.listAdminEvents({
        samithiIds: scopeSamithiIds(actor, org),
        statuses: STATUSES,
        samithiId: q.samithi,
        districtId: q.district,
        from: when === "past" ? undefined : now,
        to: when === "past" ? now : when === "next30" ? new Date(now.getTime() + 30 * DAY_MS) : undefined,
        sort: when === "past" ? "-startsAt" : "startsAt",
        limit: 500,
        offset: 0,
      });
      const rows = res.rows.filter((e) => e.volunteersNeeded !== null && e.volunteersNeeded > 0);
      const page = rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
      return {
        data: page.map((e) => ({
          event: {
            id: e.id,
            title: i18n(e.titleEn, e.titleHi),
            sevaType: e.sevaType,
            startsAt: toIso(e.startsAt),
            venue: { name: e.venueName, address: e.venueAddress, geo: e.venueLat !== null && e.venueLng !== null ? { lat: e.venueLat, lng: e.venueLng } : null },
            samithi: org.ref(e.samithiId),
            district: org.ref(e.districtId),
          },
          needed: e.volunteersNeeded,
          joined: e.volunteersJoined,
          full: e.volunteersNeeded !== null && e.volunteersJoined >= e.volunteersNeeded,
          deleteOn: addDays(istDate(e.endsAt ?? e.startsAt), 30),
        })),
        meta: { page: q.page, pageSize: q.pageSize, total: rows.length, notifyOnSignup: await notifyPref(actor.userId) },
      };
    },

    async signups(actor, eventId) {
      assertCan(actor, "volunteers.read");
      const ev = await eventInScope(ctx, actor, eventId);
      const subs = await signupsOf(eventId);
      await repo.portal.insertAudit(auditRec(actor, { action: "volunteers.view", entity: "event", entityId: eventId, scopeId: ev.samithiId, data: { count: subs.length } }));
      const needed = ev.volunteersNeeded;
      return subs.map((s, i) => {
        const p = s.personalAnswers ?? {};
        const raw = typeof p.phone === "string" ? p.phone : "";
        const e164 = normalisePhone(raw);
        return {
          id: s.id,
          firstName: typeof p.first_name === "string" ? p.first_name : "",
          phone: e164 ? maskPhone(e164) : s.submittedByMasked,
          signedUpAt: toIso(s.submittedAt),
          channel: s.source === "whatsapp" ? ("whatsapp" as const) : ("web" as const),
          waitlist: needed !== null && i >= needed,
        };
      });
    },

    async setNotify(actor, body) {
      assertCan(actor, "volunteers.read");
      const cur = await repo.m6.docGet<PrefData>("user_pref", actor.userId);
      await repo.m6.docUpsert("user_pref", { id: actor.userId, data: { ...(cur?.data ?? {}), notifyOnSignup: body.notifyOnSignup } }, [
        auditRec(actor, { action: "volunteers.notify", entity: "user_pref", entityId: actor.userId, data: { notifyOnSignup: body.notifyOnSignup } }),
      ]);
      return { notifyOnSignup: body.notifyOnSignup };
    },

    async onSignup(eventId) {
      const ev = await repo.eventById(eventId);
      if (!ev) return;
      const [samithiCoords, districtCoords] = await Promise.all([holders(ctx, "samithi_coord", ev.samithiId), holders(ctx, "district_coord", ev.districtId)]);
      const people = [];
      for (const p of [...samithiCoords, ...districtCoords]) if (await notifyPref(p.user.id)) people.push(p);
      if (people.length === 0) return;
      const joined = ev.volunteersJoined;
      await notify(ctx, people, "volunteer_signup_alert", (l) => [(l === "hi" ? ev.titleHi : null) ?? ev.titleEn, String(joined), ev.volunteersNeeded === null ? "-" : String(ev.volunteersNeeded)]);
    },
  };
}
