import type { CentreDetail, CentreListItem, CentresQuery, Gathering, Paged } from "@/contract";
import { nextWeekly, toIso } from "../domain/time";
import type { CentreRec, DataRepo, GatheringRec } from "../repo/types";
import { assembleEvents } from "./event-assembler";
import { hasAnyData, headlineTiles, loadImpactData, periodWindow } from "./impact-calc";
import { i18n, type OrgIndex } from "./org-index";
import { loadOrg, loadSettings, pageOffset } from "./shared";
import type { CentresService, ServiceDeps } from "./types";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function toCentreListItem(c: CentreRec, gatherings: readonly GatheringRec[], org: OrgIndex, now: Date): CentreListItem {
  const schedule: Gathering[] = [...gatherings]
    .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time) || a.sortOrder - b.sortOrder)
    .map((g) => ({ day: g.day, time: g.time, kind: g.kind, language: g.language }));
  let next: CentreListItem["nextGathering"] = null;
  for (const g of gatherings) {
    const at = nextWeekly(g.day, g.time, now);
    if (!next || at.getTime() < Date.parse(next.at)) next = { at: toIso(at), kind: g.kind };
  }
  const districtId = org.districtIdOf(c.samithiId) ?? "";
  return {
    id: c.id,
    slug: c.slug,
    samithiId: c.samithiId,
    districtId,
    name: i18n(c.nameEn, c.nameHi),
    address: i18n(c.addressEn, c.addressHi),
    geo: c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null,
    contactPhone: c.contactPhone,
    schedule,
    photos: c.photos,
    district: org.ref(districtId),
    samithi: org.ref(c.samithiId),
    pincode: c.pincode,
    nextGathering: next,
    distanceKm: null,
  };
}

function matches(c: CentreRec, org: OrgIndex, q: string): boolean {
  const needle = fold(q);
  const samithi = org.get(c.samithiId);
  const district = org.get(org.districtIdOf(c.samithiId) ?? "");
  const hay = [c.nameEn, c.nameHi, c.addressEn, c.addressHi, c.pincode, c.slug, samithi?.nameEn, samithi?.nameHi, district?.nameEn, district?.nameHi]
    .filter((s): s is string => !!s)
    .map(fold);
  return hay.some((h) => h.includes(needle));
}

export function createCentresService(repo: DataRepo, deps: ServiceDeps): CentresService {
  return {
    async list(q: CentresQuery): Promise<Paged<CentreListItem>> {
      const org = await loadOrg(repo);
      const meta = { page: q.page, pageSize: q.pageSize, total: 0 };
      const district = q.district ? org.district(q.district) : undefined;
      if (q.district && !district) return { data: [], meta };

      const all = (await repo.centres())
        .filter((c) => c.active && org.get(c.samithiId)?.active)
        .filter((c) => !district || org.districtIdOf(c.samithiId) === district.id)
        .filter((c) => !q.q || matches(c, org, q.q))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
      const page = all.slice(pageOffset(q.page, q.pageSize), pageOffset(q.page, q.pageSize) + q.pageSize);
      const gatherings = page.length ? await repo.gatherings(page.map((c) => c.id)) : [];
      const now = deps.now();
      return {
        data: page.map((c) => toCentreListItem(c, gatherings.filter((g) => g.centreId === c.id), org, now)),
        meta: { ...meta, total: all.length },
      };
    },

    async bySlug(slug: string): Promise<CentreDetail | null> {
      const c = await repo.centreBySlug(slug);
      if (!c || !c.active) return null;
      const [org, settings] = await Promise.all([loadOrg(repo), loadSettings(repo)]);
      if (!org.get(c.samithiId)?.active) return null;
      const now = deps.now();
      const gatherings = await repo.gatherings([c.id]);
      const base = toCentreListItem(c, gatherings, org, now);

      const win = periodWindow("this_year", now);
      const [upcoming, past, year] = await Promise.all([
        repo.listEvents({ statuses: ["planned", "postponed"], from: now, samithiId: c.samithiId, order: "asc", limit: 6, offset: 0 }),
        repo.listEvents({ statuses: ["approved"], samithiId: c.samithiId, order: "desc", limit: 6, offset: 0 }),
        loadImpactData(repo, org, { samithiId: c.samithiId }, win, settings.showEstimates),
      ]);
      const [upcomingDto, pastDto] = await Promise.all([
        assembleEvents(repo, org, upcoming.rows),
        assembleEvents(repo, org, past.rows),
      ]);
      return {
        ...base,
        upcoming: upcomingDto,
        thisYear: hasAnyData(year) ? headlineTiles(year, win.info).filter((t) => t.key !== "active") : null,
        past: pastDto,
      };
    },
  };
}
