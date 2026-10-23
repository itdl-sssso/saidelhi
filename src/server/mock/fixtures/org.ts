// Placeholder districts (spec README) and fictional samithis/centres.
import type { CentreRec, GatheringRec, OrgUnitRec, PartnerRec, SevaTypeRec } from "../../repo/types";
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
  newDelhi: fx("ORG", 12),
  north: fx("ORG", 13),
  south: fx("ORG", 14),
  west: fx("ORG", 15),
  gurugram: fx("ORG", 16),
  noida: fx("ORG", 17),
  faridabad: fx("ORG", 18),
} as const;

export const SAMITHI = {
  mayurVihar: fx("ORG", 100),
  laxmiNagar: fx("ORG", 101),
  preetVihar: fx("ORG", 102),
  karolBagh: fx("ORG", 103),
  lodhiRoad: fx("ORG", 104),
  rohini: fx("ORG", 105),
  saket: fx("ORG", 106),
  dwarka: fx("ORG", 107),
  gurugram31: fx("ORG", 108),
  noida62: fx("ORG", 109),
  faridabad: fx("ORG", 110),
} as const;

export const orgUnits: OrgUnitRec[] = [
  unit(1, "ncr", "NCR", "delhi-ncr", "Delhi NCR", "दिल्ली एनसीआर", null),
  unit(10, "district", "D-CEN", "central", "Central", "मध्य", NCR_ID, 1),
  unit(11, "district", "D-EAS", "east", "East", "पूर्व", NCR_ID, 2, [
    "Samithis across East Delhi, from Mayur Vihar to Laxmi Nagar, running eye camps, food seva and Bal Vikas classes.",
    "मयूर विहार से लक्ष्मी नगर तक पूर्वी दिल्ली की समितियाँ, जो नेत्र शिविर, भोजन सेवा और बाल विकास कक्षाएँ चलाती हैं।",
  ]),
  unit(12, "district", "D-NDL", "new-delhi", "New Delhi", "नई दिल्ली", NCR_ID, 3),
  unit(13, "district", "D-NOR", "north", "North", "उत्तर", NCR_ID, 4),
  unit(14, "district", "D-SOU", "south", "South", "दक्षिण", NCR_ID, 5),
  unit(15, "district", "D-WES", "west", "West", "पश्चिम", NCR_ID, 6),
  unit(16, "district", "D-GUR", "gurugram", "Gurugram", "गुरुग्राम", NCR_ID, 7),
  unit(17, "district", "D-NOG", "noida-ghaziabad", "Noida–Ghaziabad", "नोएडा–गाज़ियाबाद", NCR_ID, 8),
  unit(18, "district", "D-FAR", "faridabad", "Faridabad", "फ़रीदाबाद", NCR_ID, 9),
  unit(100, "samithi", "S-MAYUR", "mayur-vihar", "Samithi Mayur Vihar", "समिति मयूर विहार", DISTRICT.east),
  unit(101, "samithi", "S-LAXMI", "laxmi-nagar", "Samithi Laxmi Nagar", "समिति लक्ष्मी नगर", DISTRICT.east),
  unit(102, "samithi", "S-PREET", "preet-vihar", "Samithi Preet Vihar", "समिति प्रीत विहार", DISTRICT.east),
  unit(103, "samithi", "S-KAROL", "karol-bagh", "Samithi Karol Bagh", "समिति करोल बाग", DISTRICT.central),
  unit(104, "samithi", "S-LODHI", "lodhi-road", "Samithi Lodhi Road", "समिति लोधी रोड", DISTRICT.newDelhi),
  unit(105, "samithi", "S-ROHINI", "rohini", "Samithi Rohini", "समिति रोहिणी", DISTRICT.north),
  unit(106, "samithi", "S-SAKET", "saket", "Samithi Saket", "समिति साकेत", DISTRICT.south),
  unit(107, "samithi", "S-DWARKA", "dwarka", "Samithi Dwarka", "समिति द्वारका", DISTRICT.west),
  unit(108, "samithi", "S-GUR31", "gurugram-sector-31", "Samithi Gurugram Sector 31", "समिति गुरुग्राम सेक्टर 31", DISTRICT.gurugram),
  unit(109, "samithi", "S-NOI62", "noida-sector-62", "Samithi Noida Sector 62", "समिति नोएडा सेक्टर 62", DISTRICT.noida),
  unit(110, "samithi", "S-FARID", "faridabad-sector-15", "Samithi Faridabad Sector 15", "समिति फ़रीदाबाद सेक्टर 15", DISTRICT.faridabad),
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
