import { type LabelledFigure, type ValuePayload, type ValueSlug, VALUE_LINKS, VALUE_ORDER } from "@/contract";
import type { DataRepo } from "../repo/types";
import { loadImpactData, periodWindow } from "./impact-calc";
import { headlineFigure, sliceOfType } from "./programs";
import { loadOrg, loadSettings } from "./shared";
import type { DiscoursesService, EventsService, ServiceDeps, ValuesService } from "./types";

const GATHERING_LABEL = {
  en: "Centres holding it every week",
  hi: "हर सप्ताह आयोजित करने वाले केंद्र",
};

export function createValuesService(repo: DataRepo, deps: ServiceDeps, events: EventsService, discourses?: DiscoursesService): ValuesService {
  return {
    async bySlug(slug: ValueSlug): Promise<ValuePayload> {
      const i = VALUE_ORDER.indexOf(slug);
      const link = VALUE_LINKS[slug];
      const [org, settings] = await Promise.all([loadOrg(repo), loadSettings(repo)]);
      const win = periodWindow("this_year", deps.now());

      const facts: LabelledFigure[] = [];
      if (link.gathering) {
        const centres = (await repo.centres()).filter((c) => c.active && org.get(c.samithiId)?.active);
        const gatherings = centres.length ? await repo.gatherings(centres.map((c) => c.id)) : [];
        const holding = new Set(gatherings.filter((g) => g.kind === link.gathering).map((g) => g.centreId));
        facts.push({ key: "centres", label: GATHERING_LABEL, figure: { value: holding.size, estimate: false } });
      }
      if (link.sevaType) {
        const data = await loadImpactData(repo, org, {}, win, settings.showEstimates);
        const headline = headlineFigure(sliceOfType(data, link.sevaType), link.sevaType);
        if (headline) facts.push(headline);
      }

      // Next three across all linked seva types (weekly gatherings included).
      const lists = await Promise.all(link.sevaTypes.map((sevaType) => events.list({ sevaType, page: 1, pageSize: 3 })));
      const seen = new Set<string>();
      const upcoming = lists
        .flatMap((l) => l.data)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id))
        .filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        })
        .slice(0, 3);

      return {
        slug,
        prev: VALUE_ORDER[(i + VALUE_ORDER.length - 1) % VALUE_ORDER.length],
        next: VALUE_ORDER[(i + 1) % VALUE_ORDER.length],
        lived: { sevaType: link.sevaType, wing: link.wing },
        facts,
        upcoming,
        // Hidden while the flag is off; up to 3 published matches (VALUE_DISCOURSE_THEMES) when on.
        discourses: settings.flags.discourses ? ((await discourses?.forValue(slug)) ?? []) : null,
      };
    },
  };
}
