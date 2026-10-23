// Centre weekly gatherings expanded into calendar occurrences (contract v0.5 #3).
// Ids are `gath_<gatheringId>_<YYYYMMDD>`; GET /events/:id never resolves them.
import type { EventPublic, GatheringKind } from "@/contract";
import { addDays, istInstant, toIso } from "../domain/time";
import type { CentreRec, GatheringRec } from "../repo/types";
import { i18n, type OrgIndex } from "./org-index";

const KIND_TITLE: Record<GatheringKind, { en: string; hi: string }> = {
  bhajan: { en: "Bhajan", hi: "भजन" },
  study_circle: { en: "Study circle", hi: "अध्ययन मंडल" },
  bal_vikas: { en: "Bal Vikas class", hi: "बाल विकास कक्षा" },
};

const dow = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export interface OccurrenceWindow {
  /** 'YYYY-MM-DD' inclusive. */
  from: string;
  /** 'YYYY-MM-DD' inclusive. */
  to: string;
}

/** Default horizon when a feed has no upper bound. */
export const OCCURRENCE_HORIZON_DAYS = 28;

export function occurrencesIn(
  win: OccurrenceWindow,
  centres: readonly CentreRec[],
  gatherings: readonly GatheringRec[],
  org: OrgIndex,
  filter: { districtId?: string; samithiId?: string; sevaType?: string },
): EventPublic[] {
  const out: EventPublic[] = [];
  const byCentre = new Map(centres.map((c) => [c.id, c]));
  for (let date = win.from; date <= win.to; date = addDays(date, 1)) {
    const day = dow(date);
    for (const g of gatherings) {
      if (g.day !== day) continue;
      const c = byCentre.get(g.centreId);
      if (!c || !c.active || !org.get(c.samithiId)?.active) continue;
      const districtId = org.districtIdOf(c.samithiId) ?? "";
      if (filter.districtId && districtId !== filter.districtId) continue;
      if (filter.samithiId && c.samithiId !== filter.samithiId) continue;
      if (filter.sevaType && filter.sevaType !== g.kind) continue;
      const title = KIND_TITLE[g.kind];
      out.push({
        id: `gath_${g.id}_${date.replaceAll("-", "")}`,
        title: i18n(title.en, title.hi),
        sevaType: g.kind,
        status: "planned",
        startsAt: toIso(istInstant(date, g.time)),
        endsAt: null,
        postponedTo: null,
        venue: { name: c.nameEn, address: c.addressEn, geo: c.lat !== null && c.lng !== null ? { lat: c.lat, lng: c.lng } : null },
        samithi: org.ref(c.samithiId),
        district: org.ref(districtId),
        description: i18n("", null),
        volunteersNeeded: null,
        volunteersJoined: 0,
        bring: [],
        partner: null,
        centreContact: c.contactPhone,
        publicLinkUrl: null,
        results: null,
        articleSlug: null,
        recurring: true,
        approvedAt: null,
        centre: { slug: c.slug },
      });
    }
  }
  return out;
}
