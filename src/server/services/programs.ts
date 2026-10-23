import type { Article, LabelledFigure, Partner, PartnerKind, ProgramCard, ProgramDetail, ProgramsQuery, SevaType } from "@/contract";
import { legacyLettersFor, toArticle } from "../domain/articles";
import { ACTIVITIES, kpiDef, LABELS, SEVA_TYPE_CARDS } from "../domain/kpi";
import type { DataRepo, EventRec } from "../repo/types";
import { articleContext } from "./articles";
import { figureFor, filterData, hasAnyData, type ImpactData, kpiLabel, loadImpactData, periodWindow, tile } from "./impact-calc";
import { loadOrg, loadSettings } from "./shared";
import type { EventsService, ProgramsService, ServiceDeps } from "./types";

/** One headline KPI per seva type for the "This year: ..." line. Others fall back to activities. */
const HEADLINE: Partial<Record<SevaType, string>> = {
  eye: "eye.screened",
  blood: "blood.units",
  medical: "medical.patients",
  narayan_seva: "narayan.meals",
  bal_vikas: "balvikas.children",
};

/** Partner kinds shown when no partner is linked to events of the type. */
const FALLBACK_PARTNER_KINDS: Partial<Record<SevaType, PartnerKind[]>> = {
  eye: ["hospital"],
  medical: ["hospital"],
  blood: ["blood_bank"],
};

const FUNNEL: Partial<Record<SevaType, string[]>> = {
  eye: ["eye.cataract_found", "eye.cataract_referred", "eye.cataract_surgeries"],
};

/** Approved data of one seva type (events and estimates). */
export function sliceOfType(data: ImpactData, type: SevaType): ImpactData {
  return filterData(
    data,
    (e) => e.sevaType === type,
    (e) => e.sevaType === type || (e.sevaType === null && kpiDef(e.kpiKey)?.sevaType === type),
  );
}

/** This year's headline figure for a type, or null when nothing was reported. */
export function headlineFigure(slice: ImpactData, type: SevaType): LabelledFigure | null {
  const key = HEADLINE[type];
  if (key) {
    const figure = figureFor(slice, key);
    if (figure.value !== null) return { key, label: kpiLabel(key), figure };
  }
  const count = figureFor(slice, ACTIVITIES);
  if (typeof count.value === "number" && count.value > 0) return { key: ACTIVITIES, label: LABELS.activities, figure: count };
  return null;
}

/** 3-4 tiles per type: its card keys plus volunteer hours. */
function kpiKeysFor(type: SevaType): string[] {
  const keys = SEVA_TYPE_CARDS.find((c) => c.sevaType === type)?.keys ?? [ACTIVITIES];
  return [...new Set([...keys, "volunteer_hours"])].slice(0, 4);
}

async function partnersFor(repo: DataRepo, type: SevaType, recent: readonly EventRec[]): Promise<Partner[]> {
  const ids = [...new Set(recent.map((e) => e.partnerId).filter((id): id is string => !!id))];
  let recs = ids.length ? await repo.partners(ids) : [];
  if (recs.length === 0) {
    const kinds = FALLBACK_PARTNER_KINDS[type];
    recs = kinds ? await repo.partnersByKind(kinds) : [];
  }
  return recs
    .filter((p) => p.active && p.showPublicly !== false)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ id: p.id, name: p.name, kind: p.kind, city: p.city }));
}

export function createProgramsService(repo: DataRepo, deps: ServiceDeps, events: EventsService): ProgramsService {
  async function context() {
    const [org, settings, types] = await Promise.all([loadOrg(repo), loadSettings(repo), repo.sevaTypes()]);
    const now = deps.now();
    return { org, settings, now, win: periodWindow("this_year", now), types: types.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder) };
  }

  return {
    async list(q: ProgramsQuery): Promise<ProgramCard[]> {
      const { org, settings, now, win, types: all } = await context();
      const types = all.filter((s) => !q.wing || s.wing === q.wing);
      if (types.length === 0) return [];
      const [data, nexts] = await Promise.all([
        loadImpactData(repo, org, {}, win, settings.showEstimates),
        Promise.all(
          types.map((s) =>
            repo.listEvents({ statuses: ["planned", "postponed"], from: now, sevaType: s.code, recurring: false, order: "asc", limit: 1, offset: 0 }),
          ),
        ),
      ]);
      return types.map((s, i): ProgramCard => {
        const next = nexts[i].rows[0];
        return {
          sevaType: s.code,
          label: org.sevaType(s.code).label,
          icon: s.icon,
          wing: s.wing,
          next: next ? { eventId: next.id, startsAt: next.startsAt.toISOString(), district: org.ref(next.districtId) } : null,
          thisYear: headlineFigure(sliceOfType(data, s.code), s.code),
          href: `/programs/${s.code}`,
        };
      });
    },

    async exists(type: string): Promise<boolean> {
      return (await repo.sevaTypes()).some((s) => s.active && s.code === type);
    },

    async byType(type: SevaType): Promise<ProgramDetail | null> {
      const { org, settings, win, types } = await context();
      const rec = types.find((s) => s.code === type);
      if (!rec) return null;

      const [data, upcoming, recent] = await Promise.all([
        loadImpactData(repo, org, {}, win, settings.showEstimates),
        events.list({ sevaType: type, page: 1, pageSize: 6 }),
        repo.listEvents({ statuses: ["approved"], sevaType: type, order: "desc", limit: 50, offset: 0 }),
      ]);
      const slice = sliceOfType(data, type);

      const kpis = hasAnyData(slice) ? kpiKeysFor(type).map((k) => tile(slice, k, win.info)) : null;
      const funnelKeys = FUNNEL[type];
      // Eye always shows its funnel: unreported steps are "—", never 0.
      const funnel = funnelKeys ? funnelKeys.map((key): LabelledFigure => ({ key, label: kpiLabel(key), figure: figureFor(slice, key) })) : null;

      // Articles: reports linked to events of this type, else the key-programmes category.
      let articleRecs = await repo.articlesForEvents(recent.rows.map((e) => e.id), 3);
      if (articleRecs.length === 0) {
        articleRecs = (await repo.listArticles({ categories: legacyLettersFor("key_programs"), limit: 3, offset: 0 })).rows;
      }
      const ctx = articleContext(org, deps.mediaBase);
      const articles: Article[] = articleRecs.map((a) => toArticle(a, ctx));

      return {
        sevaType: type,
        label: org.sevaType(type).label,
        icon: rec.icon,
        wing: rec.wing,
        href: `/programs/${type}`,
        kpis,
        funnel,
        upcoming: upcoming.data,
        articles,
        partners: await partnersFor(repo, type, recent.rows),
      };
    },
  };
}
