// Heuristics for migrated legacy posts (docs/progress/M5-plan.md decision D7).
// Untagged stays null (no district badge): a wrong badge is worse than none.

/** District slug -> phrases that point at it. "East", "North" alone are too ambiguous to match. */
export const DISTRICT_ALIASES: Record<string, readonly string[]> = {
  central: ["central delhi", "karol bagh", "paharganj", "connaught place", "rajender nagar", "rajinder nagar"],
  east: ["east delhi", "mayur vihar", "laxmi nagar", "preet vihar", "shahdara", "vivek vihar", "patparganj", "dilshad garden"],
  north: ["north delhi", "rohini", "pitampura", "model town", "ashok vihar", "shalimar bagh", "civil lines"],
  "south-east": ["south east delhi", "sarita vihar", "kailash hills", "greater kailash", "lajpat nagar", "okhla", "kalkaji", "lodhi road", "lodhi estate"],
  "south-west": ["south west delhi", "rama krishna puram", "rk puram", "vasant kunj", "munirka", "saket", "hauz khas", "malviya nagar", "mehrauli"],
  west: ["west delhi", "dwarka", "janakpuri", "rajouri garden", "punjabi bagh", "uttam nagar", "paschim vihar", "tilak nagar", "najafgarh", "madhu vihar"],
  faridabad: ["faridabad"],
  gurugram: ["gurugram", "gurgaon"],
  "gautam-buddh-nagar": ["noida", "greater noida", "gautam buddh nagar", "gautam budh nagar"],
  ghaziabad: ["ghaziabad", "indirapuram", "vaishali", "vasundhara", "sahibabad"],
};

/** Phrases that only weakly point at a district (none today; "New Delhi" is no longer a district). */
const WEAK = new Set<string>();

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * District slug mentioned in `badge_tag` / title, or null. `badge` wins over `title`; within one
 * text the district with the most phrase hits wins and ties stay untagged.
 */
export function detectDistrict(badge: string | null | undefined, title: string | null | undefined): string | null {
  for (const text of [badge, title]) {
    if (!text) continue;
    const hay = ` ${fold(text)} `;
    const hits: [string, number][] = [];
    for (const [slug, phrases] of Object.entries(DISTRICT_ALIASES)) {
      const n = phrases.reduce((sum, p) => (hay.includes(` ${fold(p)} `) ? sum + (WEAK.has(p) ? 1 : 2) : sum), 0);
      if (n > 0) hits.push([slug, n]);
    }
    if (hits.length === 0) continue;
    hits.sort((a, b) => b[1] - a[1]);
    if (hits.length === 1 || hits[0][1] > hits[1][1]) return hits[0][0];
    return null; // ambiguous inside the stronger source: do not guess from the weaker one
  }
  return null;
}
