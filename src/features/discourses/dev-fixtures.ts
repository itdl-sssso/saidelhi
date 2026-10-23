// TEMP M7: placeholder adapter until the backend `services().discourses` lands (run B1).
// Placeholder text only; real discourse text is copyrighted and never committed.
import {
  DISCOURSE_CREDIT,
  DISCOURSE_THEMES,
  DiscourseTheme,
  type DiscourseCard,
  type DiscourseDetail,
  type DiscoursesPayload,
  type DiscoursesQuery,
} from "@/contract";

const para = (n: number) => `Placeholder paragraph ${n}. The approved English text from the Trust goes here.`;
const paraHi = (n: number) => `प्लेसहोल्डर अनुच्छेद ${n}। ट्रस्ट का स्वीकृत पाठ यहाँ आएगा।`;

const mk = (n: number, slug: string, themes: DiscourseTheme[]): DiscourseDetail => ({
  slug,
  n,
  title: { en: `Placeholder discourse ${n}`, hi: `प्लेसहोल्डर प्रवचन ${n}` },
  date: `0${n} October 197${n}`,
  place: "Prasanthi Nilayam",
  occasion: "Placeholder occasion",
  source: { coll: `Sathya Sai Speaks Vol ${n}, Ch ${n}`, url: null, pdf: null },
  themes,
  why: { en: "Placeholder line on why this talk matters.", hi: null },
  blocks: [
    { id: "s1", type: "heading", en: "Placeholder heading", hi: "प्लेसहोल्डर शीर्षक" },
    { id: "s2", type: "para", en: para(1), hi: paraHi(1) },
    { id: "s3", type: "para", en: para(2), hi: paraHi(2) },
    { id: "s4", type: "poem", en: "Placeholder verse line one\nPlaceholder verse line two", hi: "प्लेसहोल्डर पद्य पंक्ति एक\nप्लेसहोल्डर पद्य पंक्ति दो" },
    { id: "s5", type: "para", en: para(3), hi: paraHi(3) },
  ],
  quotes: [
    { en: para(1), hi: paraHi(1), blockId: "s2" },
    { en: para(2), hi: paraHi(2), blockId: "s3" },
  ],
  related: [],
  value: "sathya",
  translation: { reviewedBy: null, publishedAt: "2026-10-01T00:00:00.000Z" },
  credit: DISCOURSE_CREDIT,
});

const ALL = [
  mk(1, "placeholder-one", ["character", "education"]),
  mk(2, "placeholder-two", ["discipline", "time"]),
  mk(3, "placeholder-three", ["service", "friendship"]),
];

const summary = (d: DiscourseDetail) => ({ slug: d.slug, n: d.n, title: d.title, date: d.date, place: d.place, themes: d.themes });
const card = (d: DiscourseDetail): DiscourseCard => ({ ...summary(d), occasion: d.occasion, why: d.why, coll: d.source.coll });

export function fixtureList(q: DiscoursesQuery): DiscoursesPayload {
  const needle = q.q?.toLowerCase();
  const items = ALL.filter(
    (d) =>
      (!q.theme || d.themes.includes(q.theme)) &&
      (!needle || `${d.title.en} ${d.title.hi} ${d.place} ${d.occasion}`.toLowerCase().includes(needle)),
  );
  return {
    items: items.map(card),
    themes: DiscourseTheme.options.map((key) => ({
      key,
      label: DISCOURSE_THEMES[key].label,
      count: ALL.filter((d) => d.themes.includes(key)).length,
    })),
    featured: { quote: ALL[0].quotes[0], discourse: summary(ALL[0]) },
    credit: DISCOURSE_CREDIT,
  };
}

export function fixtureDetail(slug: string): DiscourseDetail | null {
  const d = ALL.find((x) => x.slug === slug);
  return d ? { ...d, related: ALL.filter((x) => x !== d).map(summary) } : null;
}
