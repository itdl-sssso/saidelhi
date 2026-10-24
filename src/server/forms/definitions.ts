// Hand-written form definitions for the pilot (spec 31: the builder arrives in M6).
// Each publishes as version 1 of its template; ids are stable so mock and seeded DB agree.
import type { FormDefinition, FormField, FormSection, I18nText, LinkPurpose, SevaType } from "@/contract";
import { fx } from "../mock/fixtures/ids";

export const t = (en: string, hi: string): I18nText => ({ en, hi });

type Opts = Partial<Omit<FormField, "id" | "kind" | "label">>;

const field = (id: string, kind: FormField["kind"], label: I18nText, o: Opts = {}): FormField => ({
  id,
  kind,
  label,
  help: null,
  required: false,
  min: null,
  max: null,
  kpi: null,
  locked: false,
  personal: false,
  ...o,
});

const num = (id: string, label: I18nText, o: Opts = {}) => field(id, "number", label, { min: 0, max: 100_000, ...o });
export const section = (id: string, title: I18nText, fields: FormField[], personalData = false): FormSection => ({ id, title, fields, personalData });

const err = (op: "lte" | "gte" | "eq", left: string, right: string | number, message: I18nText) =>
  ({ op, left, right, level: "error", message }) as const;
const warn = (op: "lte" | "gte" | "eq", left: string, right: string | number, message: I18nText) =>
  ({ op, left, right, level: "warn", message }) as const;

/** Locked core fields shared by every report form (spec 31). */
export function aboutSection(partnerLabel: I18nText): FormSection {
  return section("about", t("About the camp", "शिविर के बारे में"), [
    field("samithi", "text", t("Samithi", "समिति"), { required: true, locked: true, readOnly: true, prefill: "samithi" }),
    field("date", "date", t("Date", "तारीख़"), { required: true, locked: true, prefill: "date" }),
    field("venue", "text", t("Venue", "स्थान"), { required: true, locked: true, prefill: "venue", min: 2, max: 200 }),
    field("partner", "text", partnerLabel, { prefill: "partner", max: 120 }),
    num("volunteers", t("Sevadal members", "सेवादल सदस्य"), {
      required: true,
      locked: true,
      max: 1000,
      warnAbove: 150,
      kpi: "volunteers",
    }),
    num("volunteer_hours", t("Sevadal hours", "सेवादल घंटे"), {
      required: true,
      locked: true,
      max: 20_000,
      warnAbove: 1500,
      help: t("All Sevadal members together, including set-up.", "सभी सेवादल सदस्यों के कुल घंटे, तैयारी सहित।"),
      kpi: "volunteer_hours",
      checks: [warn("gte", "volunteer_hours", "volunteers", t("Fewer hours than Sevadal members. Please check.", "सेवादल सदस्यों से कम घंटे। कृपया जाँच लें।"))],
    }),
  ]);
}

const registerPhoto = () =>
  field("register_photo", "file", t("Photo of the register", "रजिस्टर की फ़ोटो"), {
    max: 3,
    help: t(
      "Optional. Kept private and never published. ID numbers are never read.",
      "वैकल्पिक। यह निजी रखी जाती है और कभी प्रकाशित नहीं होती। पहचान संख्याएँ कभी नहीं पढ़ी जातीं।",
    ),
  });

const notesSection = () =>
  section("notes", t("Notes", "टिप्पणियाँ"), [
    field("notes", "text", t("Anything else the district should know", "कुछ और जो ज़िले को पता होना चाहिए"), { max: 2000 }),
  ]);

const POWERS = [
  ["p_1_0", "+1.0"],
  ["p_1_5", "+1.5"],
  ["p_2_0", "+2.0"],
  ["p_2_5", "+2.5"],
  ["p_3_0", "+3.0"],
] as const;
const POWER_SUM = [...POWERS.map(([id]) => id), "p_other"].join("+");

export const FORM_IDS = {
  templates: { eye: fx("FTP", 1), blood: fx("FTP", 2), volunteer: fx("FTP", 3) },
  versions: { eye: fx("FVR", 1), blood: fx("FVR", 2), volunteer: fx("FVR", 3) },
} as const;

export const eyeCampReport: FormDefinition = {
  id: FORM_IDS.versions.eye,
  templateId: FORM_IDS.templates.eye,
  version: 1,
  sevaType: "eye",
  title: t("Eye camp report", "नेत्र शिविर रिपोर्ट"),
  sections: [
    aboutSection(t("Partner hospital", "साझेदार अस्पताल")),
    section("people", t("People", "लोग"), [
      num("registered", t("Registered and screened", "पंजीकृत और जाँचे गए"), {
        required: true,
        locked: true,
        max: 10_000,
        warnAbove: 1000,
        kpi: "eye.screened",
      }),
      num("male", t("Men", "पुरुष"), { kpi: "people.male" }),
      num("female", t("Women", "महिलाएँ"), {
        kpi: "people.female",
        checks: [err("lte", "male+female", "registered", t("Men and women together can't be more than people screened.", "पुरुष और महिलाएँ मिलाकर जाँचे गए लोगों से अधिक नहीं हो सकते।"))],
      }),
      num("under_18", t("Under 18", "18 वर्ष से कम"), {
        kpi: "people.under_18",
        checks: [err("lte", "under_18", "registered", t("Can't be more than people screened.", "जाँचे गए लोगों से अधिक नहीं हो सकते।"))],
      }),
    ]),
    section("spectacles", t("Spectacles", "चश्मे"), [
      num("spectacles_total", t("Reading spectacles given", "दिए गए पढ़ने के चश्मे"), {
        required: true,
        max: 10_000,
        kpi: "eye.spectacles",
        checks: [
          err("eq", POWER_SUM, "spectacles_total", t("Spectacles by power must add up to the total given.", "पावर के अनुसार चश्मों का योग कुल दिए गए चश्मों के बराबर होना चाहिए।")),
          warn("lte", "spectacles_total", "registered", t("More spectacles than people screened. Please check.", "जाँचे गए लोगों से अधिक चश्मे। कृपया जाँच लें।")),
        ],
      }),
      field("powers_help", "help", t("How many of each power?", "हर पावर के कितने?"), { showIf: { field: "spectacles_total", op: "gt", value: 0 } }),
      ...POWERS.map(([id, power]) =>
        num(id, t(power, power), { kpi: `eye.spectacles_by_power:${power}`, showIf: { field: "spectacles_total", op: "gt", value: 0 } }),
      ),
      num("p_other", t("Other powers", "अन्य पावर"), {
        kpi: "eye.spectacles_by_power:other",
        showIf: { field: "spectacles_total", op: "gt", value: 0 },
      }),
    ]),
    section("cataract", t("Cataract", "मोतियाबिंद"), [
      num("cataract_found", t("Cataract found", "मोतियाबिंद पाए गए"), {
        required: true,
        kpi: "eye.cataract_found",
        checks: [err("lte", "cataract_found", "registered", t("Can't be more than people screened.", "जाँचे गए लोगों से अधिक नहीं हो सकते।"))],
      }),
      num("cataract_referred", t("Referred for surgery", "ऑपरेशन के लिए भेजे गए"), {
        kpi: "eye.cataract_referred",
        showIf: { field: "cataract_found", op: "gt", value: 0 },
        checks: [err("lte", "cataract_referred", "cataract_found", t("Can't be more than cataract found.", "पाए गए मोतियाबिंद से अधिक नहीं हो सकते।"))],
      }),
      num("cataract_surgeries", t("Surgeries done", "किए गए ऑपरेशन"), {
        kpi: "eye.cataract_surgeries",
        help: t("Usually known later. Fill this when you know.", "यह आमतौर पर बाद में पता चलता है। पता चलने पर भरें।"),
        showIf: { field: "cataract_found", op: "gt", value: 0 },
        checks: [err("lte", "cataract_surgeries", "cataract_referred", t("Can't be more than people referred.", "भेजे गए लोगों से अधिक नहीं हो सकते।"))],
      }),
    ]),
    section("attach", t("Attach", "संलग्न करें"), [registerPhoto()]),
    section(
      "followup",
      t("Follow-up list", "फ़ॉलो-अप सूची"),
      [
        field("followup_help", "help", t("Personal data", "व्यक्तिगत जानकारी"), {
          help: t(
            "Only add people who agreed to be contacted. Never write ID numbers. This list is kept private and is never shown on dashboards or exports.",
            "केवल उन्हीं लोगों को जोड़ें जिन्होंने संपर्क के लिए सहमति दी है। कोई पहचान संख्या न लिखें। यह सूची निजी रखी जाती है और डैशबोर्ड या एक्सपोर्ट में कभी नहीं दिखती।",
          ),
        }),
        field("followup", "repeater", t("People to follow up", "फ़ॉलो-अप के लिए लोग"), {
          personal: true,
          max: 300,
          fields: [
            field("name", "text", t("Name", "नाम"), { required: true, personal: true, max: 80 }),
            num("age", t("Age", "आयु"), { personal: true, max: 120 }),
            field("gender", "select", t("Gender", "लिंग"), {
              personal: true,
              options: [
                { value: "female", label: t("Female", "महिला") },
                { value: "male", label: t("Male", "पुरुष") },
                { value: "other", label: t("Other", "अन्य") },
              ],
            }),
            field("phone", "text", t("Phone", "फ़ोन"), { personal: true, format: "phone", max: 20 }),
            field("locality", "text", t("Locality", "इलाका"), {
              personal: true,
              max: 80,
              help: t("Colony or village only, not the full address.", "केवल कॉलोनी या गाँव, पूरा पता नहीं।"),
            }),
            field("consent", "yesno", t("This person agreed to be contacted for follow-up", "इस व्यक्ति ने फ़ॉलो-अप के लिए संपर्क किए जाने पर सहमति दी है"), {
              required: true,
              consent: true,
            }),
          ],
        }),
      ],
      true,
    ),
    notesSection(),
  ],
};

const REASONS = [
  ["d_low_hb", "low_hb", t("Low haemoglobin", "कम हीमोग्लोबिन")],
  ["d_bp", "bp", t("Blood pressure", "रक्तचाप")],
  ["d_weight", "weight", t("Low weight", "कम वज़न")],
  ["d_illness", "illness", t("Recent illness or medicine", "हाल की बीमारी या दवा")],
  ["d_other", "other", t("Other reason", "अन्य कारण")],
] as const;

export const bloodCampReport: FormDefinition = {
  id: FORM_IDS.versions.blood,
  templateId: FORM_IDS.templates.blood,
  version: 1,
  sevaType: "blood",
  title: t("Blood donation camp report", "रक्तदान शिविर रिपोर्ट"),
  sections: [
    aboutSection(t("Blood bank", "ब्लड बैंक")),
    section("donors", t("Donors", "रक्तदाता"), [
      num("registered", t("Donors registered", "पंजीकृत रक्तदाता"), { required: true, locked: true, max: 5000, warnAbove: 500, kpi: "blood.registered" }),
      num("deferred", t("Deferred (could not donate)", "स्थगित (रक्तदान नहीं कर सके)"), {
        required: true,
        kpi: "blood.deferred",
        checks: [err("lte", "deferred", "registered", t("Can't be more than donors registered.", "पंजीकृत रक्तदाताओं से अधिक नहीं हो सकते।"))],
      }),
      num("accepted", t("Donated (accepted)", "रक्तदान किया (स्वीकृत)"), {
        required: true,
        kpi: "blood.donors",
        checks: [
          err("lte", "accepted", "registered", t("Can't be more than donors registered.", "पंजीकृत रक्तदाताओं से अधिक नहीं हो सकते।")),
          warn("eq", "accepted+deferred", "registered", t("Donated and deferred usually add up to registered. Please check.", "रक्तदान किए और स्थगित मिलाकर आमतौर पर पंजीकृत के बराबर होते हैं। कृपया जाँच लें।")),
        ],
      }),
      num("first_time", t("First-time donors", "पहली बार रक्तदान करने वाले"), {
        kpi: "blood.first_time",
        checks: [err("lte", "first_time", "accepted", t("Can't be more than donors accepted.", "स्वीकृत रक्तदाताओं से अधिक नहीं हो सकते।"))],
      }),
      num("female", t("Women donors", "महिला रक्तदाता"), {
        kpi: "blood.female_donors",
        checks: [err("lte", "female", "accepted", t("Can't be more than donors accepted.", "स्वीकृत रक्तदाताओं से अधिक नहीं हो सकते।"))],
      }),
    ]),
    section("units", t("Units", "यूनिट"), [
      num("units", t("Units collected", "एकत्र यूनिट"), {
        required: true,
        kpi: "blood.units",
        checks: [err("lte", "units", "accepted", t("Must be no more than donors accepted.", "स्वीकृत रक्तदाताओं से अधिक नहीं हो सकती।"))],
      }),
    ]),
    section("deferral", t("Deferral reasons", "स्थगन के कारण"), [
      field("deferral_help", "help", t("How many were deferred for each reason?", "हर कारण से कितने स्थगित हुए?"), {
        showIf: { field: "deferred", op: "gt", value: 0 },
      }),
      ...REASONS.map(([id, dim, label]) =>
        num(id, label, {
          kpi: `blood.deferred_by_reason:${dim}`,
          showIf: { field: "deferred", op: "gt", value: 0 },
          checks:
            id === "d_other"
              ? [err("lte", REASONS.map(([rid]) => rid).join("+"), "deferred", t("Reasons can't add up to more than donors deferred.", "कारणों का योग स्थगित रक्तदाताओं से अधिक नहीं हो सकता।"))]
              : undefined,
        }),
      ),
    ]),
    section("attach", t("Attach", "संलग्न करें"), [registerPhoto()]),
    notesSection(),
  ],
};

export const volunteerSignup: FormDefinition = {
  id: FORM_IDS.versions.volunteer,
  templateId: FORM_IDS.templates.volunteer,
  version: 1,
  sevaType: "other",
  title: t("Join this seva", "इस सेवा से जुड़ें"),
  sections: [
    section(
      "you",
      t("Your details", "आपका विवरण"),
      [
        field("first_name", "text", t("First name", "पहला नाम"), { required: true, personal: true, min: 1, max: 40 }),
        field("phone", "text", t("WhatsApp number", "व्हाट्सऐप नंबर"), {
          required: true,
          personal: true,
          format: "phone",
          max: 20,
          help: t("We'll remind you on WhatsApp the day before.", "हम आपको एक दिन पहले व्हाट्सऐप पर याद दिलाएँगे।"),
        }),
        field("consent", "yesno", t("I agree to be contacted on WhatsApp about this seva.", "मैं इस सेवा के बारे में व्हाट्सऐप पर संपर्क किए जाने के लिए सहमत हूँ।"), {
          required: true,
          consent: true,
        }),
      ],
      true,
    ),
  ],
};

export interface TemplateSeed {
  id: string;
  code: string;
  /** Report templates are chosen by seva type; public ones by purpose. */
  sevaType: SevaType | null;
  purpose: LinkPurpose;
  title: I18nText;
  definition: FormDefinition;
}

export const TEMPLATE_SEEDS: readonly TemplateSeed[] = [
  { id: FORM_IDS.templates.eye, code: "eye_camp_report", sevaType: "eye", purpose: "report", title: eyeCampReport.title, definition: eyeCampReport },
  { id: FORM_IDS.templates.blood, code: "blood_camp_report", sevaType: "blood", purpose: "report", title: bloodCampReport.title, definition: bloodCampReport },
  { id: FORM_IDS.templates.volunteer, code: "volunteer_signup", sevaType: null, purpose: "public", title: volunteerSignup.title, definition: volunteerSignup },
];
