import type { DistrictPayload } from "@/contract";
import type { DataRepo } from "../repo/types";
import { toCentreListItem } from "./centres";
import { assembleEvents } from "./event-assembler";
import { bySevaType, hasAnyData, headlineTiles, loadImpactData, periodWindow } from "./impact-calc";
import { i18n } from "./org-index";
import { loadOrg, loadSettings } from "./shared";
import type { DistrictsService, ServiceDeps } from "./types";

export function createDistrictsService(repo: DataRepo, deps: ServiceDeps): DistrictsService {
  return {
    async bySlug(slug: string): Promise<DistrictPayload | null> {
      const [org, settings] = await Promise.all([loadOrg(repo), loadSettings(repo)]);
      const district = org.district(slug);
      if (!district) return null;
      const now = deps.now();
      const win = periodWindow("this_year", now);
      const samithiIds = new Set(org.samithisOf(district.id).map((s) => s.id));

      const [data, upcoming, centres] = await Promise.all([
        loadImpactData(repo, org, { districtId: district.id }, win, settings.showEstimates),
        repo.listEvents({ statuses: ["planned", "postponed"], from: now, districtId: district.id, order: "asc", limit: 6, offset: 0 }),
        repo.centres(),
      ]);
      const districtCentres = centres
        .filter((c) => c.active && samithiIds.has(c.samithiId))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
      const gatherings = districtCentres.length ? await repo.gatherings(districtCentres.map((c) => c.id)) : [];

      return {
        district: org.toOrgUnit(district),
        samithiCount: samithiIds.size,
        intro: district.introEn ? i18n(district.introEn, district.introHi) : null,
        kpis: hasAnyData(data) ? headlineTiles(data, win.info) : null,
        bySevaType: bySevaType(data, org),
        upcoming: await assembleEvents(repo, org, upcoming.rows),
        centres: districtCentres.map((c) => toCentreListItem(c, gatherings.filter((g) => g.centreId === c.id), org, now)),
      };
    },
  };
}
