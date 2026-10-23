import {
  type EventPublic,
  type EventResults,
  type PublicEventStatus,
  PUBLIC_EVENT_STATUSES,
  type ResultBreakdown,
  type ResultTile,
} from "@/contract";
import { compareDims, kpiDef, resultLayout, toFigure } from "../domain/kpi";
import { toIso, toIsoOrNull } from "../domain/time";
import type { CentreRec, DataRepo, EventRec, KpiFactRec } from "../repo/types";
import { i18n, type OrgIndex } from "./org-index";

export const isPublicStatus = (s: string): s is PublicEventStatus =>
  (PUBLIC_EVENT_STATUSES as readonly string[]).includes(s);

/** Builds approved results from facts. Caller guarantees the event is approved. */
export function buildResults(ev: EventRec, facts: readonly KpiFactRec[]): EventResults {
  const approved = facts.filter((f) => f.approvedAt !== null);
  const layout = resultLayout(ev.sevaType);
  const totalsFor = (key: string) => approved.filter((f) => f.kpiKey === key && f.dim === "");
  const figureFor = (key: string) => {
    const rows = totalsFor(key);
    return toFigure(
      rows.map((r) => r.value),
      { estimate: rows.some((r) => r.estimate), suppress: kpiDef(key)?.suppress ?? true },
    );
  };

  const tiles: ResultTile[] = layout.tiles.map((key) => ({
    key,
    label: kpiDef(key)?.label ?? { en: key, hi: null },
    figure: figureFor(key),
  }));

  const breakdowns: ResultBreakdown[] = [];
  for (const key of layout.breakdowns) {
    const rows = approved.filter((f) => f.kpiKey === key && f.dim !== "");
    if (rows.length === 0) continue;
    const dims = [...new Set(rows.map((r) => r.dim))].sort(compareDims);
    const suppress = kpiDef(key)?.suppress ?? true;
    breakdowns.push({
      key,
      label: kpiDef(key)?.label ?? { en: key, hi: null },
      bars: dims.map((dim) => {
        const d = rows.filter((r) => r.dim === dim);
        return { label: dim, figure: toFigure(d.map((r) => r.value), { estimate: d.some((r) => r.estimate), suppress }) };
      }),
    });
  }

  let followUp: EventResults["followUp"] = null;
  if (layout.followUp) {
    const ofRows = totalsFor(layout.followUp.ofKey).map((r) => r.value).filter((v): v is number => v !== null);
    if (ofRows.length > 0) {
      const of = ofRows.reduce((a, b) => a + b, 0);
      const doneRows = totalsFor(layout.followUp.doneKey).map((r) => r.value).filter((v): v is number => v !== null);
      const done = doneRows.length ? doneRows.reduce((a, b) => a + b, 0) : null;
      if (of > 0) followUp = { label: layout.followUp.label, done, of };
    }
  }

  return { tiles, breakdowns, followUp, photos: ev.resultsPhotos };
}

/** Batch-converts event records into public DTOs (non-public statuses are dropped). */
export async function assembleEvents(repo: DataRepo, org: OrgIndex, events: readonly EventRec[]): Promise<EventPublic[]> {
  const visible = events.filter((e) => isPublicStatus(e.status));
  if (visible.length === 0) return [];

  const approvedIds = visible.filter((e) => e.status === "approved").map((e) => e.id);
  const partnerIds = [...new Set(visible.map((e) => e.partnerId).filter((id): id is string => !!id))];
  const [partners, centres, facts, slugs] = await Promise.all([
    partnerIds.length ? repo.partners(partnerIds) : Promise.resolve([]),
    repo.centres(),
    approvedIds.length ? repo.approvedFacts({ eventIds: approvedIds }) : Promise.resolve([]),
    repo.articleSlugsForEvents(visible.map((e) => e.id)),
  ]);

  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const centreById = new Map(centres.map((c) => [c.id, c]));
  const centreBySamithi = new Map<string, CentreRec>();
  for (const c of centres) if (c.active && !centreBySamithi.has(c.samithiId)) centreBySamithi.set(c.samithiId, c);
  const factsByEvent = new Map<string, KpiFactRec[]>();
  for (const f of facts) {
    const list = factsByEvent.get(f.eventId) ?? [];
    list.push(f);
    factsByEvent.set(f.eventId, list);
  }

  return visible.map((e): EventPublic => {
    const status = e.status as PublicEventStatus;
    const centre = (e.centreId ? centreById.get(e.centreId) : undefined) ?? centreBySamithi.get(e.samithiId);
    const partner = e.partnerId ? partnerById.get(e.partnerId) : undefined;
    return {
      id: e.id,
      title: i18n(e.titleEn, e.titleHi),
      sevaType: e.sevaType,
      status,
      startsAt: toIso(e.startsAt),
      endsAt: toIsoOrNull(e.endsAt),
      postponedTo: status === "postponed" ? toIsoOrNull(e.postponedTo) : null,
      venue: {
        name: e.venueName,
        address: e.venueAddress,
        geo: e.venueLat !== null && e.venueLng !== null ? { lat: e.venueLat, lng: e.venueLng } : null,
      },
      samithi: org.ref(e.samithiId),
      district: org.ref(e.districtId),
      description: i18n(e.descriptionEn ?? "", e.descriptionHi),
      volunteersNeeded: e.volunteersNeeded,
      volunteersJoined: e.volunteersJoined,
      bring: e.bring,
      partner: partner && partner.showPublicly !== false ? { name: partner.name } : null,
      centreContact: centre?.contactPhone ?? null,
      // Public form links arrive with M2.
      publicLinkUrl: null,
      results: status === "approved" ? buildResults(e, factsByEvent.get(e.id) ?? []) : null,
      articleSlug: slugs.get(e.id) ?? null,
      recurring: e.recurring,
      approvedAt: status === "approved" ? toIsoOrNull(e.approvedAt) : null,
      centre: centre ? { slug: centre.slug } : null,
    };
  });
}
