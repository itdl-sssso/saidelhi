import type { DistrictImpact, ImpactPayload, ImpactQuery } from "@/contract";
import { ACTIVITIES, NOTES, PEOPLE_SERVED } from "../domain/kpi";
import { istDayStart } from "../domain/time";
import type { DataRepo } from "../repo/types";
import { assembleEvents } from "./event-assembler";
import {
  bySevaType,
  figureFor,
  filterData,
  headlineTiles,
  loadImpactData,
  periodWindow,
  type Scope,
  trend,
} from "./impact-calc";
import { loadOrg, loadSettings } from "./shared";
import type { ImpactService, ServiceDeps } from "./types";

export function createImpactService(repo: DataRepo, deps: ServiceDeps): ImpactService {
  return {
    async get(q: ImpactQuery): Promise<ImpactPayload | null> {
      const now = deps.now();
      const [org, settings] = await Promise.all([loadOrg(repo), loadSettings(repo)]);
      const district = q.district ? org.district(q.district) : undefined;
      if (q.district && !district) return null;
      const scope: Scope = { districtId: district?.id };

      const win = periodWindow(q.period, now);
      const firstTrend = win.trendMonths[0];
      const lastTrend = win.trendMonths[win.trendMonths.length - 1];
      const [y, m] = lastTrend.split("-").map(Number);
      const trendEnd = istDayStart(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`);

      const [data, allDistricts, trendData] = await Promise.all([
        loadImpactData(repo, org, scope, win, settings.showEstimates),
        loadImpactData(repo, org, {}, win, settings.showEstimates),
        loadImpactData(repo, org, scope, { from: istDayStart(`${firstTrend}-01`), to: trendEnd }, settings.showEstimates),
      ]);

      const byDistrict: DistrictImpact[] = org.districts().map((d) => {
        const slice = filterData(
          allDistricts,
          (e) => e.districtId === d.id,
          (e) => org.districtIdOf(e.orgUnitId) === d.id,
        );
        return { district: org.ref(d.id), activities: figureFor(slice, ACTIVITIES), peopleServed: figureFor(slice, PEOPLE_SERVED) };
      });

      return {
        period: { ...win.info, key: q.period },
        district: district ? org.ref(district.id) : null,
        tiles: headlineTiles(data, win.info, settings.hiddenKpis),
        bySevaType: bySevaType(data, org, settings.hiddenKpis),
        byDistrict,
        trend: trend(trendData, win.trendMonths),
        recent: await assembleEvents(repo, org, data.events.slice(0, 5)),
        methodNote: NOTES.method,
        estimateNote: settings.estimateTooltip ?? NOTES.estimate,
      };
    },
  };
}
