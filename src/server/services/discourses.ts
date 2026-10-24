import {
  type DiscourseCard,
  type DiscourseDetail,
  type DiscourseSummary,
  type DiscoursesPayload,
  type DiscoursesQuery,
  type DiscourseTheme,
  DISCOURSE_CREDIT,
  DISCOURSE_THEMES,
  type ValueSlug,
  VALUE_DISCOURSE_THEMES,
  VALUE_ORDER,
} from "@/contract";
import { publicMedia } from "../domain/discourse";
import { istDate } from "../domain/time";
import type { PublishedDiscourse } from "../repo/discourse-types";
import type { DataRepo } from "../repo/types";
import { loadSettings } from "./shared";
import type { DiscoursesService, ServiceDeps } from "./types";

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
const THEME_KEYS = Object.keys(DISCOURSE_THEMES) as DiscourseTheme[];

const summary = (p: PublishedDiscourse): DiscourseSummary => {
  const { slug, n, title, date, place, themes } = p.snapshot;
  return { slug, n, title, date, place, themes };
};

const card = (p: PublishedDiscourse): DiscourseCard => ({
  ...summary(p),
  occasion: p.snapshot.occasion,
  why: p.snapshot.why,
  coll: p.snapshot.source.coll,
});

const matches = (p: PublishedDiscourse, q: string): boolean => {
  const needle = fold(q);
  const s = p.snapshot;
  return [s.title.en, s.title.hi, s.why.en, s.why.hi, s.place, s.occasion].some((t) => !!t && fold(t).includes(needle));
};

/** Deterministic per IST day: same quote for everyone all day, rotates at midnight. */
function pickFeatured(all: readonly PublishedDiscourse[], now: Date): DiscoursesPayload["featured"] {
  const pool = all.flatMap((p) => p.snapshot.quotes.map((quote) => ({ quote, p })));
  if (!pool.length) return null;
  const day = Math.floor(Date.parse(`${istDate(now)}T00:00:00Z`) / 86_400_000);
  const hit = pool[day % pool.length];
  return { quote: hit.quote, discourse: summary(hit.p) };
}

/** Same-theme published discourses, most shared themes first, then number order. */
function relatedTo(self: PublishedDiscourse, all: readonly PublishedDiscourse[]): DiscourseSummary[] {
  const mine = new Set(self.snapshot.themes);
  return all
    .filter((p) => p.slug !== self.slug)
    .map((p) => ({ p, shared: p.snapshot.themes.filter((t) => mine.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared || a.p.snapshot.n - b.p.snapshot.n)
    .slice(0, 3)
    .map((x) => summary(x.p));
}

export function createDiscoursesService(repo: DataRepo, deps: ServiceDeps): DiscoursesService {
  const flagOn = async () => (await loadSettings(repo)).flags.discourses;

  return {
    async list(q: DiscoursesQuery): Promise<DiscoursesPayload | null> {
      if (!(await flagOn())) return null;
      const all = await repo.discourses.published({ withBlocks: false });
      const themes = THEME_KEYS.map((key) => ({ key, label: DISCOURSE_THEMES[key].label, count: all.filter((p) => p.snapshot.themes.includes(key)).length }));
      const items = all
        .filter((p) => !q.theme || p.snapshot.themes.includes(q.theme))
        .filter((p) => !q.q || matches(p, q.q))
        .map(card);
      return { items, themes, featured: pickFeatured(all, deps.now()), credit: DISCOURSE_CREDIT };
    },

    async bySlug(slug: string): Promise<DiscourseDetail | null> {
      if (!(await flagOn())) return null;
      const p = await repo.discourses.publishedBySlug(slug);
      if (!p) return null;
      const [all, media] = await Promise.all([repo.discourses.published({ withBlocks: false }), repo.discourses.approvedMediaBySlug(slug)]);
      const own = new Set(p.snapshot.themes);
      const value = VALUE_ORDER.find((v) => VALUE_DISCOURSE_THEMES[v].some((t) => own.has(t))) ?? null;
      return {
        ...p.snapshot,
        related: relatedTo(p, all),
        value,
        // Reviewer group name is not configured yet (TODO(user)): the note stays hidden until it is.
        translation: { reviewedBy: null, publishedAt: p.publishedAt.toISOString() },
        credit: DISCOURSE_CREDIT,
        media: publicMedia(media),
      };
    },

    async exists(slug: string): Promise<boolean> {
      return (await flagOn()) && (await repo.discourses.publishedBySlug(slug)) !== null;
    },

    async forValue(slug: ValueSlug): Promise<DiscourseSummary[]> {
      const themes = VALUE_DISCOURSE_THEMES[slug];
      const all = await repo.discourses.published({ withBlocks: false });
      // Theme priority follows the contract order, then discourse number.
      const rank = (p: PublishedDiscourse) => Math.min(...p.snapshot.themes.map((t) => themes.indexOf(t)).filter((i) => i >= 0));
      return all
        .filter((p) => p.snapshot.themes.some((t) => themes.includes(t)))
        .sort((a, b) => rank(a) - rank(b) || a.snapshot.n - b.snapshot.n)
        .slice(0, 3)
        .map(summary);
    },
  };
}
