import { type EventPublic, type EventsQuery, type Paged, PUBLIC_EVENT_STATUSES } from "@/contract";
import { addDays, istDate, istDayStart } from "../domain/time";
import type { DataRepo } from "../repo/types";
import { assembleEvents, isPublicStatus } from "./event-assembler";
import { OCCURRENCE_HORIZON_DAYS, occurrencesIn } from "./gatherings";
import { loadOrg, pageOffset } from "./shared";
import type { EventsService, ServiceDeps } from "./types";

export function createEventsService(repo: DataRepo, deps: ServiceDeps): EventsService {
  return {
    async list(q: EventsQuery): Promise<Paged<EventPublic>> {
      const org = await loadOrg(repo);
      const meta = { page: q.page, pageSize: q.pageSize, total: 0 };
      const district = q.district ? org.district(q.district) : undefined;
      const samithi = q.samithi ? org.samithi(q.samithi) : undefined;
      // Unknown filter values match nothing rather than being ignored.
      if ((q.district && !district) || (q.samithi && !samithi)) return { data: [], meta };

      const from = q.from ?? (q.to ? undefined : istDate(deps.now()));
      const offset = pageOffset(q.page, q.pageSize);
      // The top (offset+pageSize) of the merged feed is inside the top of each part.
      const { rows, total } = await repo.listEvents({
        statuses: PUBLIC_EVENT_STATUSES,
        from: from ? istDayStart(from) : undefined,
        to: q.to ? istDayStart(addDays(q.to, 1)) : undefined,
        districtId: district?.id,
        samithiId: samithi?.id,
        sevaType: q.sevaType,
        needsVolunteers: q.needsVolunteers,
        order: "asc",
        limit: offset + q.pageSize,
        offset: 0,
      });
      const oneOff = await assembleEvents(repo, org, rows);

      // Weekly gatherings join the feed as lighter "recurring" rows.
      let recurring: EventPublic[] = [];
      if (q.needsVolunteers !== true) {
        const start = from ?? istDate(deps.now());
        const end = q.to ?? addDays(start, OCCURRENCE_HORIZON_DAYS);
        const centres = (await repo.centres()).filter((c) => c.active);
        const gatherings = centres.length ? await repo.gatherings(centres.map((c) => c.id)) : [];
        recurring = occurrencesIn({ from: start, to: end }, centres, gatherings, org, {
          districtId: district?.id,
          samithiId: samithi?.id,
          sevaType: q.sevaType,
        });
      }
      const merged = [...oneOff, ...recurring].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
      return { data: merged.slice(offset, offset + q.pageSize), meta: { ...meta, total: total + recurring.length } };
    },

    async byId(id: string): Promise<EventPublic | null> {
      const ev = await repo.eventById(id);
      if (!ev || !isPublicStatus(ev.status)) return null;
      const org = await loadOrg(repo);
      const [dto] = await assembleEvents(repo, org, [ev]);
      return dto ?? null;
    },
  };
}
