// KPI catalogue and public-figure rules. Moves to the kpi_definition table in M6.
import type { Figure, I18nText, PublicCount, SevaType } from "@/contract";

export interface KpiDef {
  key: string;
  label: I18nText;
  sevaType: SevaType | null;
  /** Counts of people (or derived from people): public values 1–4 become { lt5: true }. */
  suppress: boolean;
  /** Contributes to "people served". */
  served: boolean;
}

const def = (key: string, en: string, hi: string, sevaType: SevaType | null, suppress: boolean, served = false): KpiDef => ({
  key,
  label: { en, hi },
  sevaType,
  suppress,
  served,
});

export const KPI_DEFS: readonly KpiDef[] = [
  def("volunteer_hours", "Sevadal hours", "सेवादल घंटे", null, false),
  def("volunteers", "Sevadal members", "सेवादल सदस्य", null, false),
  // Demographic breakdowns: district level and above only (spec README data rules).
  def("people.male", "Men", "पुरुष", null, true),
  def("people.female", "Women", "महिलाएँ", null, true),
  def("people.under_18", "Under 18", "18 वर्ष से कम", null, true),
  def("eye.screened", "People screened", "जाँचे गए लोग", "eye", true, true),
  def("eye.spectacles", "Spectacles given", "दिए गए चश्मे", "eye", true),
  def("eye.spectacles_by_power", "Spectacles by power", "पावर के अनुसार चश्मे", "eye", true),
  def("eye.cataract_found", "Cataract found", "मोतियाबिंद पाए गए", "eye", true),
  def("eye.cataract_referred", "Referred for cataract surgery", "मोतियाबिंद ऑपरेशन के लिए भेजे गए", "eye", true),
  def("eye.cataract_surgeries", "Cataract surgeries", "मोतियाबिंद ऑपरेशन", "eye", true),
  def("blood.registered", "Donors registered", "पंजीकृत रक्तदाता", "blood", true),
  def("blood.deferred", "Donors deferred", "स्थगित रक्तदाता", "blood", true),
  def("blood.deferred_by_reason", "Deferrals by reason", "कारण के अनुसार स्थगन", "blood", true),
  def("blood.donors", "Donors", "रक्तदाता", "blood", true),
  def("blood.units", "Units collected", "एकत्र यूनिट", "blood", true),
  def("blood.first_time", "First-time donors", "पहली बार के रक्तदाता", "blood", true),
  def("blood.female_donors", "Women donors", "महिला रक्तदाता", "blood", true),
  def("medical.patients", "Patients seen", "देखे गए मरीज़", "medical", true, true),
  def("narayan.meals", "Meals served", "परोसे गए भोजन", "narayan_seva", true, true),
  def("narayan.ration_kits", "Ration kits", "राशन किट", "narayan_seva", true, true),
  def("balvikas.classes", "Classes held", "आयोजित कक्षाएँ", "bal_vikas", false),
  def("balvikas.children", "Children enrolled", "नामांकित बच्चे", "bal_vikas", true),
];

const BY_KEY = new Map(KPI_DEFS.map((d) => [d.key, d]));
export const kpiDef = (key: string): KpiDef | undefined => BY_KEY.get(key);
export const SERVED_KEYS = KPI_DEFS.filter((d) => d.served).map((d) => d.key);

/** Synthetic keys computed from events rather than facts. */
export const ACTIVITIES = "activities";
export const PEOPLE_SERVED = "people_served";
export const CAMPS = "camps";

export const LABELS = {
  activities: { en: "Activities", hi: "गतिविधियाँ" },
  peopleServed: { en: "People served", hi: "सेवा पाने वाले लोग" },
  active: { en: "Samithis active", hi: "सक्रिय समितियाँ" },
  camps: { en: "Camps", hi: "शिविर" },
} satisfies Record<string, I18nText>;

export const NOTES = {
  peopleServed: {
    en: "Counts services given; one person may attend more than once.",
    hi: "यह दी गई सेवाओं की गिनती है; एक व्यक्ति एक से अधिक बार आ सकता है।",
  },
  estimate: {
    en: "Rough figure supplied by the district for years before the platform.",
    hi: "प्लेटफ़ॉर्म से पहले के वर्षों के लिए ज़िले द्वारा दिया गया अनुमानित आँकड़ा।",
  },
  method: {
    en: "Figures count only reports approved by district coordinators and are refreshed nightly. People served counts services given, so one person may be counted more than once. Any count below 5 is shown as \"fewer than 5\" to protect privacy. Figures marked \"Estimate\" are rough totals supplied by districts for the years before this platform.",
    hi: "आँकड़ों में केवल ज़िला समन्वयकों द्वारा स्वीकृत रिपोर्टें गिनी जाती हैं और ये हर रात अपडेट होते हैं। सेवा पाने वाले लोगों में दी गई सेवाएँ गिनी जाती हैं, इसलिए एक व्यक्ति एक से अधिक बार गिना जा सकता है। गोपनीयता के लिए 5 से कम की संख्या \"5 से कम\" दिखाई जाती है। \"अनुमान\" वाले आँकड़े इस प्लेटफ़ॉर्म से पहले के वर्षों के लिए ज़िलों द्वारा दिए गए मोटे योग हैं।",
  },
} satisfies Record<string, I18nText>;

/** Seva-type cards on Impact/District pages (spec 04 §3). */
export const SEVA_TYPE_CARDS: readonly { sevaType: SevaType; keys: readonly string[] }[] = [
  { sevaType: "blood", keys: [CAMPS, "blood.units", "blood.donors"] },
  { sevaType: "eye", keys: ["eye.screened", "eye.spectacles", "eye.cataract_surgeries"] },
  { sevaType: "medical", keys: [CAMPS, "medical.patients"] },
  { sevaType: "narayan_seva", keys: ["narayan.meals", "narayan.ration_kits"] },
  { sevaType: "bal_vikas", keys: ["balvikas.classes", "balvikas.children"] },
];

/** Result layout per seva type for the public Event page (spec 10). */
export interface ResultLayout {
  tiles: readonly string[];
  breakdowns: readonly string[];
  followUp: { label: I18nText; doneKey: string; ofKey: string } | null;
}

const DEFAULT_LAYOUT: ResultLayout = { tiles: ["volunteer_hours"], breakdowns: [], followUp: null };

export const RESULT_LAYOUTS: Partial<Record<SevaType, ResultLayout>> = {
  eye: {
    tiles: ["eye.screened", "eye.spectacles", "eye.cataract_found"],
    breakdowns: ["eye.spectacles_by_power"],
    followUp: { label: { en: "Cataract surgeries", hi: "मोतियाबिंद ऑपरेशन" }, doneKey: "eye.cataract_surgeries", ofKey: "eye.cataract_found" },
  },
  blood: { tiles: ["blood.donors", "blood.units"], breakdowns: [], followUp: null },
  medical: { tiles: ["medical.patients"], breakdowns: [], followUp: null },
  narayan_seva: { tiles: ["narayan.meals", "narayan.ration_kits"], breakdowns: [], followUp: null },
  bal_vikas: { tiles: ["balvikas.classes", "balvikas.children"], breakdowns: [], followUp: null },
};

export const resultLayout = (t: SevaType): ResultLayout => RESULT_LAYOUTS[t] ?? DEFAULT_LAYOUT;

/** Public small-number suppression: 1–4 → { lt5: true }. 0 stays 0. */
export function publicCount(n: number, suppress: boolean): PublicCount {
  return suppress && n > 0 && n < 5 ? { lt5: true } : n;
}

/**
 * Sums reported values into a public Figure. `null` when nothing was reported
 * (no values, or every value blank) — never coerced to 0.
 */
export function toFigure(values: readonly (number | null)[], opts: { estimate?: boolean; suppress: boolean }): Figure {
  const reported = values.filter((v): v is number => v !== null);
  const estimate = opts.estimate ?? false;
  if (reported.length === 0) return { value: null, estimate };
  const total = reported.reduce((a, b) => a + b, 0);
  return { value: publicCount(total, opts.suppress), estimate };
}

/** Sort order for breakdown dimension labels like '+1.0', '+2.5'. */
export function compareDims(a: string, b: string): number {
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}
