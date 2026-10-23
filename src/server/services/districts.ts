import type { DemographicSplit, DistrictPayload, DistrictSummary, OrgUnit, OrgUnitsQuery } from "@/contract";
import type { DataRepo } from "../repo/types";
import { toCentreListItem } from "./centres";
import { assembleEvents } from "./event-assembler";
import { bySevaType, figureFor, hasAnyData, headlineTiles, kpiLabel, loadImpactData, periodWindow, type ImpactData } from "./impact-calc";
import { i18n } from "./org-index";
import { loadOrg, loadSettings } from "./shared";
import type { DistrictsService, ServiceDeps } from "./types";

const DEMOGRAPHICS: { key: DemographicSplit["key"]; label: DemographicSplit["label"]; bars: { key: string; kpi: string }[] }[] = [
  { key: "gender", label: { en: "Gender", hi: "लिंग" }, bars: [{ key: "male", kpi: "people.male" }, { key: "female", kpi: "people.female" }] },
  { key: "age", label: { en: "Age", hi: "आयु" }, bars: [{ key: "under_18", kpi: "people.under_18" }] },
];

/** Age / gender bars from the people.* KPIs; splits with nothing reported are dropped. */
export function demographicsFor(data: ImpactData): DemographicSplit[] {
  return DEMOGRAPHICS.map((d) => ({
    key: d.key,
    label: d.label,
    bars: d.bars.map((b) => ({ key: b.key, label: kpiLabel(b.kpi), figure: figureFor(data, b.kpi) })),
  })).filter((d) => d.bars.some((b) => b.figure.value !== null));
}

export function createDistrictsService(repo: DataRepo, deps: ServiceDeps): DistrictsService {
  return {
    async units(q: OrgUnitsQuery): Promise<OrgUnit[]> {
      const org = await loadOrg(repo);
      if (q.kind === "district") return org.districts().map((u) => org.toOrgUnit(u));
      const parents = q.district ? [org.district(q.district)].filter((d) => !!d) : org.districts();
      return parents
        .flatMap((d) => org.samithisOf(d.id))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        .map((u) => org.toOrgUnit(u));
    },

    async list(): Promise<DistrictSummary[]> {
      const [org, centres] = await Promise.all([loadOrg(repo), repo.centres()]);
      return org.districts().map((d) => {
        const samithis = new Set(org.samithisOf(d.id).map((x) => x.id));
        return {
          district: org.ref(d.id),
          samithiCount: samithis.size,
          centreCount: centres.filter((c) => c.active && samithis.has(c.samithiId)).length,
        };
      });
    },

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
        demographics: demographicsFor(data),
        upcoming: await assembleEvents(repo, org, upcoming.rows),
        centres: districtCentres.map((c) => toCentreListItem(c, gatherings.filter((g) => g.centreId === c.id), org, now)),
      };
    },
  };
}
