// Real SSSSO Delhi NCR districts and samithis (src/server/data/sssso-units.json) plus fictional dev centres.
import type { CentreRec, GatheringRec, OrgUnitRec, PartnerRec, SevaTypeRec } from "../../repo/types";
import realUnits from "../../data/sssso-units.json";
import { fx } from "./ids";

const unit = (
  n: number,
  kind: OrgUnitRec["kind"],
  code: string,
  slug: string,
  nameEn: string,
  nameHi: string,
  parentId: string | null,
  sortOrder = 0,
  intro?: [string, string],
): OrgUnitRec => ({
  id: fx("ORG", n),
  code,
  kind,
  nameEn,
  nameHi,
  slug,
  parentId,
  introEn: intro?.[0] ?? null,
  introHi: intro?.[1] ?? null,
  sortOrder,
  active: true,
  mergedIntoId: null,
  version: 1,
});

export const NCR_ID = fx("ORG", 1);

export const DISTRICT = {
  central: fx("ORG", 10),
  east: fx("ORG", 11),
  north: fx("ORG", 12),
  southEast: fx("ORG", 13),
  southWest: fx("ORG", 14),
  west: fx("ORG", 15),
  faridabad: fx("ORG", 16),
  gurugram: fx("ORG", 17),
  gautamBuddhNagar: fx("ORG", 18),
  ghaziabad: fx("ORG", 19),
} as const;

interface RealSamithi {
  name: string;
  nameHi: string;
  slug: string;
  code: string;
  kind: string;
  address?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  /** Locality text from the old public map (public data). */
  localName?: string;
  area?: string;
}
interface RealBuilding {
  slug: string;
  name: string;
  address: string;
  pincode?: string;
  lat: number;
  lng: number;
  samithi: string;
}
interface RealDistrict {
  name: string;
  nameHi: string;
  slug: string;
  code: string;
  samithis: RealSamithi[];
  centres?: RealBuilding[];
}
const REAL = (realUnits as { districts: RealDistrict[] }).districts;
const EAST_INTRO: [string, string] = [
  "Samithis across East Delhi, running eye camps, food seva and Bal Vikas classes.",
  "पूर्वी दिल्ली की समितियाँ, जो नेत्र शिविर, भोजन सेवा और बाल विकास कक्षाएँ चलाती हैं।",
];
const DISTRICT_IDS = Object.values(DISTRICT);

/** Real samithis get ids fx("ORG", 200 + position) in file order. */
const realSamithis = REAL.flatMap((d, di) => d.samithis.map((s) => ({ ...s, districtId: DISTRICT_IDS[di] })));
const realId = (slug: string) => {
  const i = realSamithis.findIndex((s) => s.slug === slug);
  if (i < 0) throw new Error(`unknown samithi ${slug}`);
  return fx("ORG", 200 + i);
};

/**
 * Dev-fixture handles onto real samithis. Each fictional dev centre/event hangs off a real
 * samithi that has no published address (so the map never shows two pins for one unit).
 */
export const SAMITHI = {
  mayurVihar: realId("east-3"),
  laxmiNagar: realId("east-4"),
  preetVihar: realId("east-5"),
  karolBagh: realId("central-1"),
  lodhiRoad: realId("south-east-2"),
  rohini: realId("north-3"),
  saket: realId("south-west-1"),
  dwarka: realId("west-1"),
  gurugram31: realId("gurugram-1"),
  noida62: realId("gautam-buddh-nagar-2"),
  faridabad: realId("faridabad-1"),
} as const;

const DEV_SAMITHI_IDS = new Set<string>(Object.values(SAMITHI));
const DISTRICT_NAMES: Record<string, string> = Object.fromEntries(REAL.map((d, i) => [DISTRICT_IDS[i], d.name]));

export const orgUnits: OrgUnitRec[] = [
  unit(1, "ncr", "NCR", "delhi-ncr", "Delhi NCR", "दिल्ली एनसीआर", null),
  ...REAL.map((d, i) =>
    unit(10 + i, "district", `D-${d.code}`, d.slug, d.name, d.nameHi, NCR_ID, i + 1, d.slug === "east" ? EAST_INTRO : undefined),
  ),
  ...realSamithis.map((s, i) => unit(200 + i, "samithi", s.code, s.slug, s.name, s.nameHi, s.districtId, i + 1)),
];

/** Icons follow the design-system Lucide vocabulary. */
export const sevaTypes: SevaTypeRec[] = [
  { code: "eye", labelEn: "Eye camp", labelHi: "नेत्र शिविर", icon: "eye", wing: "service", sortOrder: 1, active: true },
  { code: "blood", labelEn: "Blood donation", labelHi: "रक्तदान", icon: "droplets", wing: "service", sortOrder: 2, active: true },
  { code: "medical", labelEn: "Medical camp", labelHi: "चिकित्सा शिविर", icon: "stethoscope", wing: "service", sortOrder: 3, active: true },
  { code: "narayan_seva", labelEn: "Narayan Seva (food)", labelHi: "नारायण सेवा (भोजन)", icon: "utensils", wing: "service", sortOrder: 4, active: true },
  { code: "bal_vikas", labelEn: "Bal Vikas class", labelHi: "बाल विकास कक्षा", icon: "graduation-cap", wing: "educational", sortOrder: 5, active: true },
  { code: "bhajan", labelEn: "Bhajan", labelHi: "भजन", icon: "music", wing: "spiritual", sortOrder: 6, active: true },
  { code: "study_circle", labelEn: "Study circle", labelHi: "अध्ययन मंडल", icon: "book-open", wing: "spiritual", sortOrder: 7, active: true },
  { code: "disaster_relief", labelEn: "Disaster relief", labelHi: "आपदा राहत", icon: "life-buoy", wing: "service", sortOrder: 8, active: true },
  { code: "cleanliness", labelEn: "Cleanliness drive", labelHi: "स्वच्छता अभियान", icon: "sparkles", wing: "service", sortOrder: 9, active: true },
  { code: "other", labelEn: "Other seva", labelHi: "अन्य सेवा", icon: "hand-heart", wing: "service", sortOrder: 10, active: true },
];

export const PARTNER = {
  icare: fx("PRT", 1),
  bloodBank: fx("PRT", 2),
  clinic: fx("PRT", 3),
} as const;

export const partners: PartnerRec[] = [
  { id: PARTNER.icare, name: "ICARE Eye Hospital", kind: "hospital", city: "Noida", active: true },
  { id: PARTNER.bloodBank, name: "Sample District Blood Bank", kind: "blood_bank", city: "Delhi", active: true },
  { id: PARTNER.clinic, name: "Sample Community Clinic", kind: "ngo", city: "Gurugram", active: true },
];

const centre = (
  n: number,
  samithiId: string,
  slug: string,
  nameEn: string,
  nameHi: string,
  addressEn: string,
  addressHi: string,
  pincode: string,
  geo: [number, number] | null,
): CentreRec => ({
  id: fx("CEN", n),
  slug,
  samithiId,
  nameEn,
  nameHi,
  addressEn,
  addressHi,
  pincode,
  lat: geo?.[0] ?? null,
  lng: geo?.[1] ?? null,
  // Obviously fictional placeholder numbers.
  contactPhone: `+91 11 2000 0${String(n).padStart(3, "0")}`,
  photos: [],
  active: true,
});

export const CENTRE = { mayurVihar: fx("CEN", 1) } as const;

export const centres: CentreRec[] = [
  centre(1, SAMITHI.mayurVihar, "mayur-vihar", "Sai Centre Mayur Vihar", "साई केंद्र मयूर विहार", "Community hall, Pocket 2, Mayur Vihar Phase-1, Delhi", "सामुदायिक भवन, पॉकेट 2, मयूर विहार फ़ेज़-1, दिल्ली", "110091", [28.6043, 77.2947]),
  centre(2, SAMITHI.laxmiNagar, "laxmi-nagar", "Sai Centre Laxmi Nagar", "साई केंद्र लक्ष्मी नगर", "First floor, Block C, Laxmi Nagar, Delhi", "पहली मंज़िल, ब्लॉक सी, लक्ष्मी नगर, दिल्ली", "110092", [28.6304, 77.2777]),
  centre(3, SAMITHI.preetVihar, "preet-vihar", "Sai Centre Preet Vihar", "साई केंद्र प्रीत विहार", "Library room, Preet Vihar, Delhi", "पुस्तकालय कक्ष, प्रीत विहार, दिल्ली", "110092", [28.6414, 77.2967]),
  centre(4, SAMITHI.karolBagh, "karol-bagh", "Sai Centre Karol Bagh", "साई केंद्र करोल बाग", "Main hall, Karol Bagh, Delhi", "मुख्य हॉल, करोल बाग, दिल्ली", "110005", [28.6519, 77.1909]),
  centre(5, SAMITHI.lodhiRoad, "lodhi-road", "Sai Centre Lodhi Road", "साई केंद्र लोधी रोड", "Lodhi Road, New Delhi", "लोधी रोड, नई दिल्ली", "110003", [28.5918, 77.2273]),
  centre(6, SAMITHI.rohini, "rohini", "Sai Centre Rohini", "साई केंद्र रोहिणी", "Sector 9, Rohini, Delhi", "सेक्टर 9, रोहिणी, दिल्ली", "110085", [28.7158, 77.1135]),
  centre(7, SAMITHI.saket, "saket", "Sai Centre Saket", "साई केंद्र साकेत", "Block J, Saket, New Delhi", "ब्लॉक जे, साकेत, नई दिल्ली", "110017", [28.5245, 77.2066]),
  centre(8, SAMITHI.dwarka, "dwarka", "Sai Centre Dwarka", "साई केंद्र द्वारका", "Sector 10, Dwarka, New Delhi", "सेक्टर 10, द्वारका, नई दिल्ली", "110075", [28.5815, 77.0590]),
  centre(9, SAMITHI.gurugram31, "gurugram-sector-31", "Sai Centre Gurugram", "साई केंद्र गुरुग्राम", "Sector 31, Gurugram, Haryana", "सेक्टर 31, गुरुग्राम, हरियाणा", "122001", [28.4520, 77.0490]),
  centre(10, SAMITHI.noida62, "noida-sector-62", "Sai Centre Noida", "साई केंद्र नोएडा", "Sector 62, Noida, Uttar Pradesh", "सेक्टर 62, नोएडा, उत्तर प्रदेश", "201309", [28.6270, 77.3650]),
  centre(11, SAMITHI.faridabad, "faridabad-sector-15", "Sai Centre Faridabad", "साई केंद्र फ़रीदाबाद", "Sector 15, Faridabad, Haryana", "सेक्टर 15, फ़रीदाबाद, हरियाणा", "121007", [28.4010, 77.3150]),
  // Real samithis with published coordinates (ssssoindia address and/or old public-map pin).
  // Samithis that carry a fictional dev centre above are skipped so the map never shows two pins for one unit.
  ...realSamithis.flatMap((s, i) => {
    if (s.lat == null || s.lng == null || DEV_SAMITHI_IDS.has(fx("ORG", 200 + i))) return [];
    const where = s.address ?? [s.localName, s.area ?? DISTRICT_NAMES[s.districtId]].filter(Boolean).join(", ");
    return [
      {
        ...centre(100 + i, fx("ORG", 200 + i), s.slug, `${s.name} Samithi`, `समिति ${s.nameHi}`, where, where, s.pincode ?? "", [s.lat, s.lng]),
        addressHi: null,
        pincode: s.pincode ?? null,
        contactPhone: null,
      } satisfies CentreRec,
    ];
  }),
  // Buildings pinned on the old public map (Sai centres, mandirs, International Centre), on the nearest samithi.
  ...REAL.flatMap((d) =>
    (d.centres ?? []).map((b, k) => {
      const si = realSamithis.findIndex((s) => s.slug === b.samithi);
      if (si < 0) throw new Error(`unknown samithi ${b.samithi}`);
      return {
        ...centre(400 + REAL.indexOf(d) * 10 + k, fx("ORG", 200 + si), b.slug, b.name, b.name, b.address, b.address, b.pincode ?? "", [b.lat, b.lng]),
        nameHi: null,
        addressHi: null,
        pincode: b.pincode ?? null,
        contactPhone: null,
      } satisfies CentreRec;
    }),
  ),
];

let g = 0;
const gathering = (centreN: number, day: number, time: string, kind: GatheringRec["kind"], language: GatheringRec["language"]): GatheringRec => ({
  id: fx("GTH", ++g),
  centreId: fx("CEN", centreN),
  day,
  time,
  kind,
  language,
  sortOrder: g,
});

export const gatherings: GatheringRec[] = [
  gathering(1, 4, "18:30", "bhajan", "hi"),
  gathering(1, 6, "17:00", "study_circle", "en"),
  gathering(1, 0, "10:00", "bal_vikas", "mixed"),
  gathering(2, 0, "18:00", "bhajan", "hi"),
  gathering(2, 3, "19:00", "study_circle", "hi"),
  gathering(3, 0, "11:00", "bal_vikas", "mixed"),
  gathering(4, 4, "19:00", "bhajan", "mixed"),
  gathering(5, 0, "18:00", "bhajan", "en"),
  gathering(6, 4, "18:30", "bhajan", "hi"),
  gathering(6, 0, "10:30", "bal_vikas", "hi"),
  gathering(7, 0, "17:30", "bhajan", "mixed"),
  gathering(8, 6, "18:00", "bhajan", "hi"),
  gathering(9, 0, "18:00", "bhajan", "en"),
  gathering(9, 6, "11:00", "study_circle", "en"),
  gathering(10, 4, "19:00", "bhajan", "mixed"),
  // Faridabad (centre 11) is new: no gatherings yet.
];
