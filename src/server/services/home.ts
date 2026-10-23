import type { HomePayload, Thought, WingCard } from "@/contract";
import { CENTENARY_LETTERS, toArticle } from "../domain/articles";
import { ACTIVITIES, PEOPLE_SERVED } from "../domain/kpi";
import { istDate } from "../domain/time";
import type { ContentItemRec, DataRepo } from "../repo/types";
import { articleContext } from "./articles";
import { assembleEvents } from "./event-assembler";
import { DEFAULT_HOME } from "./kpis";
import { activeTile, hasAnyData, loadImpactData, periodWindow, tile } from "./impact-calc";
import { i18n } from "./org-index";
import { loadOrg, loadSettings } from "./shared";
import type { HomeService, ServiceDeps } from "./types";

/** Defaults until editors manage wing cards as content_item home sections (M6). */
export const DEFAULT_WINGS: readonly WingCard[] = [
  {
    wing: "service",
    title: { en: "Service", hi: "सेवा" },
    summary: { en: "Medical and eye camps, blood donation, food seva and relief.", hi: "चिकित्सा व नेत्र शिविर, रक्तदान, भोजन सेवा और राहत कार्य।" },
    href: "/programs?wing=service",
  },
  {
    wing: "educational",
    title: { en: "Education", hi: "शिक्षा" },
    summary: { en: "Bal Vikas classes in human values for children.", hi: "बच्चों के लिए मानवीय मूल्यों की बाल विकास कक्षाएँ।" },
    href: "/programs?wing=educational",
  },
  {
    wing: "spiritual",
    title: { en: "Spiritual", hi: "आध्यात्मिक" },
    summary: { en: "Bhajans, study circles and festivals open to all.", hi: "सबके लिए खुले भजन, अध्ययन मंडल और उत्सव।" },
    href: "/programs?wing=spiritual",
  },
  {
    wing: "mahila",
    title: { en: "Mahila", hi: "महिला" },
    summary: { en: "Seva and study led by the women's wing.", hi: "महिला विभाग द्वारा सेवा और अध्ययन।" },
    href: "/programs?wing=mahila",
  },
  {
    wing: "youth",
    title: { en: "Youth", hi: "युवा" },
    summary: { en: "Young adults in seva, skills and leadership.", hi: "सेवा, कौशल और नेतृत्व में युवा।" },
    href: "/programs?wing=youth",
  },
];

function pickThought(items: readonly ContentItemRec[], today: string): Thought | null {
  const t = items
    .filter((i) => i.status === "published" && i.bodyEn && i.date && i.date <= today)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
  if (!t || !t.bodyEn || !t.date) return null;
  return {
    date: t.date,
    text: i18n(t.bodyEn, t.bodyHi),
    source: t.sourceEn ? i18n(t.sourceEn, t.sourceHi) : null,
  };
}

/** Exactly four tiles: admin picks first, padded from the defaults. */
function homeKeys(picked: readonly string[]): string[] {
  return [...new Set([...picked, ...DEFAULT_HOME, "volunteer_hours"])].slice(0, 4);
}

export function createHomeService(repo: DataRepo, deps: ServiceDeps): HomeService {
  return {
    async get(): Promise<HomePayload> {
      const now = deps.now();
      const [org, settings, thoughts] = await Promise.all([loadOrg(repo), loadSettings(repo), repo.contentItems("thought_for_day")]);
      const win = periodWindow("this_year", now);
      const ctx = articleContext(org, deps.mediaBase);

      const [upcoming, year, latest, centenary] = await Promise.all([
        repo.listEvents({ statuses: ["planned"], from: now, order: "asc", limit: 6, offset: 0 }),
        loadImpactData(repo, org, {}, win, settings.showEstimates),
        repo.listArticles({ limit: 3, offset: 0 }),
        repo.listArticles({ categories: CENTENARY_LETTERS, limit: 12, offset: 0 }),
      ]);

      return {
        thought: pickThought(thoughts, istDate(now)),
        upcoming: await assembleEvents(repo, org, upcoming.rows),
        kpis: hasAnyData(year)
          ? homeKeys(settings.homeTiles).map((k) => (k === "active" ? activeTile(year, win.info) : tile(year, k, win.info)))
          : null,
        articles: latest.rows.map((r) => toArticle(r, ctx)),
        centenary: centenary.rows.map((r) => toArticle(r, ctx)),
        wings: [...DEFAULT_WINGS],
      };
    },
  };
}
