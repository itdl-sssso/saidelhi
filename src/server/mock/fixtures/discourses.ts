// Synthetic PLACEHOLDER discourses for the mock data source and tests. The real texts are copyrighted
// and live only in the database (scripts/import-discourses.ts); never paste them here.
import type { DiscourseTheme, GlossaryTerm } from "@/contract";
import { buildSnapshot } from "../../domain/discourse";
import type { DiscourseBlockRec, DiscourseRec } from "../../repo/discourse-types";

const T0 = new Date("2026-10-01T06:00:00Z");

interface Seed {
  n: number;
  slug: string;
  title: [string, string];
  themes: DiscourseTheme[];
  status: DiscourseRec["status"];
  quoteOf: [string, string][];
}

const blocksFor = (id: string, title: string): DiscourseBlockRec[] => {
  const mk = (i: number, type: DiscourseBlockRec["type"], en: string, hi: string): DiscourseBlockRec => ({
    discourseId: id,
    blockId: `s${i}`,
    idx: i,
    type,
    en,
    hi,
    hiAi: hi,
    status: "approved",
  });
  return [
    mk(1, "heading", `Placeholder heading for ${title}`, `${title} के लिए नमूना शीर्षक`),
    mk(2, "para", "Placeholder paragraph one. This sample line stands in for a real passage.", "नमूना अनुच्छेद एक। यह पंक्ति असली अंश की जगह है।"),
    mk(3, "para", "Placeholder paragraph two. Another sample line for tests.", "नमूना अनुच्छेद दो। परीक्षण के लिए एक और पंक्ति।"),
    mk(4, "poem", "Sample verse line one\nSample verse line two", "नमूना पद्य पंक्ति एक\nनमूना पद्य पंक्ति दो"),
  ];
};

const SEEDS: Seed[] = [
  {
    n: 1,
    slug: "sample-students",
    title: ["Sample Talk to Students", "छात्रों से नमूना संवाद"],
    themes: ["education", "character"],
    status: "published",
    quoteOf: [
      ["Placeholder paragraph one.", "नमूना अनुच्छेद एक।"],
      ["Another sample line for tests.", "परीक्षण के लिए एक और पंक्ति।"],
    ],
  },
  {
    n: 2,
    slug: "sample-peace",
    title: ["Sample Talk on Peace", "शान्ति पर नमूना संवाद"],
    themes: ["mental_peace", "time"],
    status: "published",
    quoteOf: [
      ["This sample line stands in for a real passage.", "यह पंक्ति असली अंश की जगह है।"],
      ["Placeholder paragraph two.", "नमूना अनुच्छेद दो।"],
    ],
  },
  {
    n: 3,
    slug: "sample-service",
    title: ["Sample Talk on Service", "सेवा पर नमूना संवाद"],
    themes: ["service", "character"],
    status: "published",
    quoteOf: [
      ["Placeholder paragraph one.", "नमूना अनुच्छेद एक।"],
      ["Placeholder paragraph two.", "नमूना अनुच्छेद दो।"],
    ],
  },
  // Not published: must never show up publicly.
  { n: 4, slug: "sample-draft", title: ["Sample Draft Talk", "नमूना मसौदा"], themes: ["habits"], status: "in_review", quoteOf: [] },
];

export interface DiscourseFixture {
  rec: DiscourseRec;
  blocks: DiscourseBlockRec[];
}

export const discourseFixtures = (): DiscourseFixture[] =>
  SEEDS.map((s) => {
    const id = `01DISCOURSE${String(s.n).padStart(15, "0")}`;
    const blocks = blocksFor(id, s.title[0]);
    const quotes = s.quoteOf.map(([en, hi]) => ({ en, hi, blockId: blocks.find((b) => b.en.includes(en))?.blockId ?? null }));
    const rec: DiscourseRec = {
      id,
      n: s.n,
      slug: s.slug,
      titleEn: s.title[0],
      titleHi: s.title[1],
      whyEn: "Placeholder summary used for tests only.",
      whyHi: null,
      collPrint: `Sample Collection Vol ${s.n}`,
      collOnline: null,
      dateText: s.n === 1 ? "04 October 1970" : "1966",
      isoDate: s.n === 1 ? "1970-10-04" : null,
      place: "Sample Place",
      occasion: "Sample occasion",
      sourceUrl: null,
      pdfUrl: null,
      retrieved: "2026-10-19",
      themes: s.themes,
      status: s.status,
      reviewerId: null,
      notes: [],
      quotes,
      publishedAt: s.status === "published" ? new Date(T0.getTime() + s.n * 3_600_000) : null,
      publishedSnapshot: null,
      version: 1,
      createdAt: T0,
      updatedAt: T0,
    };
    if (s.status === "published") rec.publishedSnapshot = buildSnapshot(rec, blocks);
    return { rec, blocks };
  });

export const discourseGlossaryFixture: GlossaryTerm[] = [{ term: "Sample Term", hi: "नमूना शब्द", gloss: null }];
