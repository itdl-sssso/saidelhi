import type { JoinEvent, JoinPayload, JoinQuery, WhatsAppContact } from "@/contract";
import { addDays, istDate, istDayStart } from "../domain/time";
import type { DataRepo } from "../repo/types";
import { assembleEvents } from "./event-assembler";
import { loadOrg, pageOffset } from "./shared";
import type { JoinService, ServiceDeps } from "./types";

export const DEFAULT_JOIN_KEYWORD = "JOIN";

/** wa.me contact for a display number; null when none (or too short to be a phone number). */
export function whatsappContact(cfg: ServiceDeps["whatsappPublic"]): WhatsAppContact {
  const keyword = cfg?.keyword?.trim() || DEFAULT_JOIN_KEYWORD;
  const display = cfg?.number?.trim() || null;
  const digits = display?.replace(/\D/g, "") ?? "";
  if (!display || digits.length < 10) return { number: null, waMeUrl: null, keyword };
  return { number: display, waMeUrl: `https://wa.me/${digits}?text=${encodeURIComponent(keyword)}`, keyword };
}

export function createJoinService(repo: DataRepo, deps: ServiceDeps): JoinService {
  return {
    async get(q: JoinQuery): Promise<JoinPayload> {
      const whatsapp = whatsappContact(deps.whatsappPublic);
      const org = await loadOrg(repo);
      const meta = { page: q.page, pageSize: q.pageSize, total: 0 };
      const district = q.district ? org.district(q.district) : undefined;
      if (q.district && !district) return { events: { data: [], meta }, whatsapp };

      const from = q.from ?? (q.to ? undefined : istDate(deps.now()));
      const { rows, total } = await repo.listEvents({
        statuses: ["planned", "postponed"],
        from: from ? istDayStart(from) : undefined,
        to: q.to ? istDayStart(addDays(q.to, 1)) : undefined,
        districtId: district?.id,
        sevaType: q.sevaType,
        needsVolunteers: true,
        recurring: false,
        order: "asc",
        limit: q.pageSize,
        offset: pageOffset(q.page, q.pageSize),
      });
      const data: JoinEvent[] = (await assembleEvents(repo, org, rows)).map((e) => ({
        id: e.id,
        title: e.title,
        sevaType: e.sevaType,
        status: e.status,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        postponedTo: e.postponedTo,
        venue: e.venue,
        samithi: e.samithi,
        district: e.district,
        recurring: e.recurring,
        sevadalNeeded: true,
      }));
      return { events: { data, meta: { ...meta, total } }, whatsapp };
    },
  };
}
