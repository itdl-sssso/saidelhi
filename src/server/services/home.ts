import type { HomePayload, WingCard } from "@/contract";
import { officialOn, pickThoughtFor, toThought } from "./thought";
import { istDate } from "../domain/time";
import type { ContentItemRec, DataRepo } from "../repo/types";
import { listMerged } from "./articles";
import { assembleEvents } from "./event-assembler";
import { DEFAULT_HOME } from "./kpis";
import { activeTile, hasAnyData, loadImpactData, periodWindow, tile } from "./impact-calc";
import { i18n } from "./org-index";
import { loadOrg, loadSettings } from "./shared";
import type { HomeService, ServiceDeps } from "./types";

/** Defaults until editors manage wing cards as content_item home sections (M6). Summaries: legacy site wording. */
export const DEFAULT_WINGS: readonly WingCard[] = [
  {
    wing: "service",
    title: { en: "Service", hi: "सेवा" },
    summary: {
      en: "The divine life, message and teachings of Bhagawan Sri Sathya Sai Baba has always been ‘Love All, Serve All’ and ‘Help Ever, Hurt Never’.",
      hi: "भगवान श्री सत्य साई बाबा का दिव्य जीवन, संदेश और शिक्षाएँ सदा से ‘सबसे प्रेम करो, सबकी सेवा करो’ और ‘सदा सहायता करो, कभी चोट न पहुँचाओ’ रही हैं।",
    },
    href: "/programs?wing=service",
  },
  {
    wing: "educational",
    title: { en: "Education", hi: "शिक्षा" },
    summary: {
      en: "The focus of education in the Sai system is in the holistic development of the human personality.",
      hi: "साई शिक्षा पद्धति का ध्यान मानव व्यक्तित्व के समग्र विकास पर है।",
    },
    href: "/programs?wing=educational",
  },
  {
    wing: "spiritual",
    title: { en: "Spiritual", hi: "आध्यात्मिक" },
    summary: {
      en: "Spirituality is an inherent quality in every person but in the hectic, fast-paced rush of life, it is either dormant or not awakened.",
      hi: "आध्यात्मिकता हर व्यक्ति का सहज गुण है, पर जीवन की भागदौड़ में वह या तो सुप्त रहती है या जागृत नहीं हो पाती।",
    },
    href: "/programs?wing=spiritual",
  },
];

const WING_CODES: ReadonlySet<string> = new Set(DEFAULT_WINGS.map((w) => w.wing));

/** Editable wing cards (content items kind home_section, key = wing code) over the static defaults. */
function pickWings(items: readonly ContentItemRec[]): WingCard[] {
  const codeOf = (i: ContentItemRec) => (i.key ?? "").replace(/^wing\./, "");
  const mine = items.filter((i) => WING_CODES.has(codeOf(i)));
  if (mine.length === 0) return [...DEFAULT_WINGS];
  const order = new Map<string, number>();
  const edited = new Map<string, WingCard>();
  const hidden = new Set<string>();
  for (const i of mine) {
    const wing = codeOf(i) as WingCard["wing"];
    if (i.status === "archived") hidden.add(wing);
    if (i.status !== "published") continue;
    const base = DEFAULT_WINGS.find((w) => w.wing === wing) as WingCard;
    order.set(wing, i.sortOrder);
    edited.set(wing, {
      wing,
      title: i.titleEn ? i18n(i.titleEn, i.titleHi) : base.title,
      summary: i.bodyEn ? i18n(i.bodyEn, i.bodyHi) : base.summary,
      href: i.href?.startsWith("/") ? i.href : base.href,
    });
  }
  const cards = DEFAULT_WINGS.filter((w) => !hidden.has(w.wing)).map((w, idx) => ({ card: edited.get(w.wing) ?? w, at: order.get(w.wing) ?? 1000 + idx }));
  return cards.sort((a, b) => a.at - b.at).map((c) => c.card);
}

/** Exactly four tiles: admin picks first, padded from the defaults. */
function homeKeys(picked: readonly string[]): string[] {
  return [...new Set([...picked, ...DEFAULT_HOME, "volunteer_hours"])].slice(0, 4);
}

export function createHomeService(repo: DataRepo, deps: ServiceDeps): HomeService {
  return {
    async get(): Promise<HomePayload> {
      const now = deps.now();
      const [org, settings, thoughts, sections] = await Promise.all([loadOrg(repo), loadSettings(repo), repo.contentItems("thought_for_day"), repo.contentItems("home_section")]);
      const win = periodWindow("this_year", now);

      const [upcoming, year, latest, centenary] = await Promise.all([
        repo.listEvents({ statuses: ["planned"], from: now, order: "asc", limit: 6, offset: 0 }),
        loadImpactData(repo, org, {}, win, settings.showEstimates),
        listMerged(repo, deps, "all", 0, 3),
        listMerged(repo, deps, "centenary", 0, 12),
      ]);

      return {
        thought: (() => {
          const day = istDate(now);
          const p = pickThoughtFor(thoughts, day, officialOn(settings.flags));
          return p ? toThought(p, day) : null;
        })(),
        upcoming: await assembleEvents(repo, org, upcoming.rows),
        kpis: hasAnyData(year)
          ? homeKeys(settings.homeTiles).map((k) => (k === "active" ? activeTile(year, win.info) : tile(year, k, win.info)))
          : null,
        articles: latest.rows,
        centenary: centenary.rows,
        wings: pickWings(sections),
      };
    },
  };
}
