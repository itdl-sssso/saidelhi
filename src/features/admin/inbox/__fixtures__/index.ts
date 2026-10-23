// DEV-ONLY fixtures (see ../../devFixture.ts). Typed against the M4 contract; removed after integration.
import type { FormDefinition, InboxDetail, InboxListMeta, InboxRow } from "@/contract";

const num = (id: string, en: string, hi: string): FormDefinition["sections"][number]["fields"][number] => ({
  id,
  kind: "number",
  label: { en, hi },
  help: null,
  required: true,
  min: 0,
  max: 100000,
  kpi: null,
  locked: false,
  personal: false,
});

export const FIXTURE_DEFINITION: FormDefinition = {
  id: "def_fx",
  templateId: "tpl_medical",
  version: 1,
  sevaType: "medical",
  title: { en: "Medical camp report", hi: "चिकित्सा शिविर रिपोर्ट" },
  sections: [
    {
      id: "numbers",
      title: { en: "Numbers", hi: "संख्याएँ" },
      personalData: false,
      fields: [
        num("screened", "People screened", "जाँचे गए लोग"),
        num("male", "Male", "पुरुष"),
        num("female", "Female", "महिला"),
        num("children", "Under 18", "18 से कम"),
        num("medicines", "Medicines given", "दवाइयाँ दी गईं"),
        num("referred", "Referred to hospital", "अस्पताल भेजे गए"),
        num("sevadals", "Sevadals", "सेवादल"),
      ],
    },
  ],
};

const ev1 = { id: "evt_fx1", title: { en: "Medical camp · Shakarpur", hi: "चिकित्सा शिविर · शकरपुर" }, startsAt: "2026-10-12T09:00:00+05:30" };
const ev2 = { id: "evt_fx2", title: { en: "Medical camp · Laxmi Nagar", hi: "चिकित्सा शिविर · लक्ष्मी नगर" }, startsAt: "2026-10-11T09:00:00+05:30" };

export const FIXTURE_ROWS: InboxRow[] = [
  { id: "ib_fx1", source: "whatsapp", sender: "+91 99•••••07", receivedAt: "2026-10-12T18:52:00+05:30", matchedEvent: { id: ev1.id, title: ev1.title }, confidence: "check", ageDays: 0, state: "for_me", preview: "Sai Ram. Shakarpur medical camp done today. 86 people came…" },
  { id: "ib_fx2", source: "scan", sender: "+91 98•••••52", receivedAt: "2026-10-12T14:10:00+05:30", matchedEvent: { id: ev1.id, title: ev1.title }, confidence: "high", ageDays: 0, state: "for_me", preview: "register-page-1.jpg" },
  { id: "ib_fx3", source: "upload", sender: "+91 88•••••31", receivedAt: "2026-10-10T10:00:00+05:30", matchedEvent: null, confidence: "low", ageDays: 2, state: "for_me", preview: "oct-camp-sheet.xlsx" },
  { id: "ib_fx4", source: "whatsapp", sender: "+91 70•••••64", receivedAt: "2026-10-09T20:30:00+05:30", matchedEvent: { id: ev2.id, title: ev2.title }, confidence: "high", ageDays: 3, state: "escalated", preview: "Narayana Seva done. 220 served." },
];

export const FIXTURE_META: InboxListMeta = { page: 1, pageSize: 20, total: 4, counts: { for_me: 3, escalated: 1, done: 0 } } as InboxListMeta;

export const fixtureList = (tab: string) => {
  const data = FIXTURE_ROWS.filter((r) => r.state === tab);
  return { data, meta: { ...FIXTURE_META, total: data.length } };
};

export function fixtureDetail(id: string): InboxDetail {
  const row = FIXTURE_ROWS.find((r) => r.id === id) ?? FIXTURE_ROWS[0];
  const whatsapp = row.source === "whatsapp";
  return {
    id: row.id,
    source: row.source,
    sender: row.sender,
    receivedAt: row.receivedAt,
    state: row.state,
    confidence: row.confidence,
    ageDays: row.ageDays,
    raw: whatsapp ? { kind: "text", text: row.preview, mediaUrl: null } : { kind: row.source === "scan" ? "image" : "spreadsheet", text: null, mediaUrl: "/dev/register-scan.svg" },
    thread: whatsapp
      ? [
          { id: "m1", dir: "in", at: "2026-10-12T18:52:00+05:30", text: "Sai Ram. Shakarpur medical camp done today. 86 people came, 40 men 46 women, 11 children. Medicines given to 74. 6 sent to hospital. 12 sevadals.", media: null },
          { id: "m2", dir: "out", at: "2026-10-12T18:52:30+05:30", text: "Thank you. We are checking your report.", media: null },
          { id: "m3", dir: "in", at: "2026-10-12T18:53:00+05:30", text: null, media: { kind: "image", url: "/dev/register-scan.svg", name: "register.jpg" } },
        ]
      : [],
    matchedEvent: row.matchedEvent ? { ...row.matchedEvent, startsAt: ev1.startsAt } : null,
    candidates: [ev1, ev2],
    definition: row.matchedEvent ? FIXTURE_DEFINITION : null,
    draft: {
      answers: { screened: 86, male: 40, female: 46, children: 11, medicines: 74, referred: 6, sevadals: 12 },
      fieldConfidence: {
        female: { level: "low", why: { en: "Handwriting unclear on the register; the message says 46.", hi: "रजिस्टर में लिखावट साफ़ नहीं; संदेश में 46 है।" } },
        referred: { level: "check", why: { en: "Register shows 6 or 8, the digit is smudged.", hi: "रजिस्टर में 6 या 8, अंक धुंधला है।" } },
      },
    },
    aiDraftedAt: "2026-10-12T19:00:00+05:30",
    aiModel: "smollm2:1.7b",
    history: [
      { action: "ai_drafted", by: { role: null, label: "AI" }, at: "2026-10-12T19:00:00+05:30", note: null },
      { action: "matched", by: { role: "district_coord", label: "East district coordinator" }, at: "2026-10-12T19:30:00+05:30", note: null },
    ],
    can: { approve: true, edit: true, escalate: row.state === "for_me", reject: true, ask: whatsapp },
    version: 1,
  };
}
