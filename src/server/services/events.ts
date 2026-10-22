import { type EventPublic, type EventsQuery, type Paged, PUBLIC_EVENT_STATUSES } from "@/contract";
import { addDays, istDate, istDayStart } from "../domain/time";
import type { DataRepo } from "../repo/types";
import { assembleEvents, isPublicStatus } from "./event-assembler";
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
      const { rows, total } = await repo.listEvents({
        statuses: PUBLIC_EVENT_STATUSES,
        from: from ? istDayStart(from) : undefined,
        to: q.to ? istDayStart(addDays(q.to, 1)) : undefined,
        districtId: district?.id,
        samithiId: samithi?.id,
        sevaType: q.sevaType,
        needsVolunteers: q.needsVolunteers,
        order: "asc",
        limit: q.pageSize,
        offset: pageOffset(q.page, q.pageSize),
      });
      return { data: await assembleEvents(repo, org, rows), meta: { ...meta, total } };
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
