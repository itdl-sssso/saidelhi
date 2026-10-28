// Thought for the day (v0.10).
// Today's thought, in order: the official "Sai Message for the Day" pulled by cron (flag `thought_official`),
// a coordinator thought dated today, the coordinator POOL rotated by IST date, then the newest earlier dated one.
import type { FeatureFlags, I18nText, Locale, Thought } from "@/contract";
import type { ContentItemRec, DataRepo } from "../repo/types";
import { istDate } from "../domain/time";
import { loadSettings } from "./shared";
import type { ServiceDeps } from "./types";

export const OFFICIAL_KEY = "official";
export type ThoughtImage = NonNullable<Thought["image"]>;

const bi = (en: string, hi: string | null): I18nText => ({ en, hi: hi?.trim() ? hi : null });

/** The picture that belongs to a thought record (`data.image`), if any. */
export function thoughtImageOf(rec: ContentItemRec): ThoughtImage | null {
  const img = rec.data?.image as { url?: unknown; alt?: unknown } | undefined;
  if (!img || typeof img.url !== "string" || !img.url) return null;
  const alt = img.alt as Partial<I18nText> | undefined;
  return { url: img.url, alt: { en: typeof alt?.en === "string" ? alt.en : "", hi: typeof alt?.hi === "string" ? alt.hi : null } };
}

export const isOfficial = (rec: ContentItemRec) => rec.key === OFFICIAL_KEY;
export const isPoolItem = (rec: ContentItemRec) => !rec.date && !isOfficial(rec);

/** Days since 1970-01-01 of an IST calendar date; the rotation index. */
const dayNumber = (isoDate: string) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

export type ThoughtOrigin = "official" | "dated" | "pool" | "earlier";

export interface PickedThought {
  rec: ContentItemRec;
  origin: ThoughtOrigin;
}

/** Pure pick for one IST date. `official` = flag `thought_official`. */
export function pickThoughtFor(items: readonly ContentItemRec[], day: string, official: boolean): PickedThought | null {
  const live = items.filter((i) => i.status === "published" && i.bodyEn);
  if (official) {
    const o = live.find((i) => isOfficial(i) && i.date === day);
    if (o) return { rec: o, origin: "official" };
  }
  const dated = live.find((i) => !isOfficial(i) && i.date === day);
  if (dated) return { rec: dated, origin: "dated" };
  const pool = live.filter(isPoolItem).sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length) return { rec: pool[((dayNumber(day) % pool.length) + pool.length) % pool.length], origin: "pool" };
  const earlier = live
    .filter((i) => i.date && i.date < day && (official || !isOfficial(i)))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  return earlier ? { rec: earlier, origin: "earlier" } : null;
}

export function toThought(p: PickedThought, day: string): Thought {
  const r = p.rec;
  return {
    date: day,
    text: bi(r.bodyEn ?? "", r.bodyHi),
    source: r.sourceEn ? bi(r.sourceEn, r.sourceHi) : null,
    image: thoughtImageOf(r),
  };
}

export interface TodaysThought {
  text: string;
  source: string | null;
  /** The thought's own picture; null = the caller uses its default image. */
  image: ThoughtImage | null;
  /** IST date the thought is for. */
  date: string;
  origin: ThoughtOrigin;
}

export interface ThoughtService {
  today(locale: Locale): Promise<TodaysThought | null>;
}

export function createThoughtService(repo: DataRepo, deps: ServiceDeps): ThoughtService {
  return {
    async today(locale) {
      const day = istDate(deps.now());
      const [items, settings] = await Promise.all([repo.contentItems("thought_for_day"), loadSettings(repo)]);
      const picked = pickThoughtFor(items, day, officialOn(settings.flags));
      if (!picked) return null;
      const t = toThought(picked, day);
      const pickL = (v: I18nText) => (locale === "hi" && v.hi ? v.hi : v.en);
      return { text: pickL(t.text), source: t.source ? pickL(t.source) : null, image: t.image ?? null, date: day, origin: picked.origin };
    },
  };
}

export const officialOn = (flags: Partial<FeatureFlags> | undefined) => flags?.thought_official === true;
