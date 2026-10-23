// WhatsApp dev fixtures (M4): templates, reminder rules, a few conversations,
// review-inbox items of every kind and opted-in numbers. Everything is fictional.
// Phones are sealed with the environment secret, so this is built per environment.
import type { Locale, Role, SevaType } from "@/contract";
import { rulesExtract } from "../../ai/rules";
import { istInstant } from "../../domain/time";
import { eyeCampReport } from "../../forms/definitions";
import type { InboxHistoryRec, InboxItemRec, OptInRec, ReminderRuleRec, ConversationRec, WaMessageRec, WaTemplateRec } from "../../repo/wa-types";
import { EMPTY_STATE } from "../../repo/wa-types";
import { encryptField } from "../../security/crypto";
import { maskPhone, phoneHash } from "../../security/phone";
import { COPY, pick } from "../../whatsapp/bot/copy";
import { chatQuestions } from "../../whatsapp/questions";
import { DEFAULT_RULES, templateRecords } from "../../services/wa/rules";
import { overallConfidence } from "../../services/wa/shared";
import { EVENT, USER } from "./events";
import { fx } from "./ids";
import { DISTRICT, SAMITHI } from "./org";
import { devUserPhone } from "./people";

const at = (date: string, time: string) => istInstant(date, time);

export interface WaFixtures {
  templates: WaTemplateRec[];
  rules: ReminderRuleRec[];
  conversations: ConversationRec[];
  messages: WaMessageRec[];
  inbox: InboxItemRec[];
  history: InboxHistoryRec[];
  optIns: OptInRec[];
}

/** Meta approval states shown on the templates tab (fictional until the account is connected). */
const META_STATUS: Record<string, WaTemplateRec["metaStatus"]> = {
  login_code: "approved",
  plan_approval_request: "approved",
  form_link_sent: "approved",
  report_approval_request: "approved",
  seva_broadcast: "rejected",
};

const EYE_FIELDS = chatQuestions(eyeCampReport, {}).map((f) => ({ id: f.id, label: f.label, min: f.min, max: f.max, required: f.required, kpi: f.kpi }));

export function waFixtures(secret: string): WaFixtures {
  let m = 0;
  const messages: WaMessageRec[] = [];
  const history: InboxHistoryRec[] = [];
  const conversations = new Map<string, ConversationRec>();

  const person = (phone: string, locale: Locale | null, userId: string | null, lastText = "") => {
    const hash = phoneHash(secret, phone);
    const conv: ConversationRec = {
      id: fx("WCV", conversations.size + 1),
      phoneHash: hash,
      phoneEnc: encryptField(secret, phone),
      phoneMasked: maskPhone(phone),
      locale,
      userId,
      state: structuredClone(EMPTY_STATE),
      expiresAt: null,
      lastInboundAt: null,
      lastAt: at("2026-10-20", "09:00"),
      lastText,
      messageCount: 0,
      createdAt: at("2026-10-01", "09:00"),
    };
    conversations.set(phone, conv);
    return conv;
  };

  const say = (
    conv: ConversationRec,
    dir: "in" | "out",
    when: Date,
    text: string | null,
    extra: Partial<WaMessageRec> = {},
  ): WaMessageRec => {
    const rec: WaMessageRec = {
      id: fx("WMS", ++m),
      conversationId: conv.id,
      phoneHash: conv.phoneHash,
      phoneMasked: conv.phoneMasked,
      dir,
      kind: "text",
      text,
      payload: null,
      template: null,
      providerId: null,
      status: dir === "in" ? "received" : "sent",
      costPaise: 0,
      inboxItemId: null,
      mediaPath: null,
      mediaName: null,
      mediaMime: null,
      createdAt: when,
      ...extra,
    };
    messages.push(rec);
    // Fixtures are written out of order: the conversation keeps the latest activity.
    if (when >= conv.lastAt || conv.messageCount === 0) {
      conv.lastAt = when;
      conv.lastText = (text ?? rec.mediaName ?? "").slice(0, 200);
    }
    conv.messageCount += 1;
    if (dir === "in" && (!conv.lastInboundAt || when > conv.lastInboundAt)) conv.lastInboundAt = when;
    return rec;
  };

  const hist = (itemId: string, action: InboxHistoryRec["action"], when: Date, byRole: Role | null, byLabel: string, note: string | null = null) =>
    history.push({ itemId, action, byRole, byLabel, byUserId: null, note, at: when });

  const phoneA = devUserPhone(1);
  const phoneB = devUserPhone(2);
  const phoneH = devUserPhone(8);
  const phoneI = devUserPhone(9);
  const convA = person(phoneA, "hi", USER.coordA);
  const convB = person(phoneB, "en", USER.districtB);
  const convH = person(phoneH, "en", USER.coordH);
  const convI = person(phoneI, "en", USER.coordI);
  const publicPhone = "+919876543210";
  const convP = person(publicPhone, "en", null);

  const inbox: InboxItemRec[] = [];
  const item = (n: number, o: Partial<InboxItemRec> & Pick<InboxItemRec, "senderHash" | "senderMasked" | "receivedAt" | "rawKind">): InboxItemRec => {
    const rec: InboxItemRec = {
      id: fx("IBX", n),
      source: "whatsapp",
      senderEnc: null,
      conversationId: null,
      scopeId: null,
      districtId: null,
      state: "for_me",
      outcome: null,
      eventId: null,
      rawText: null,
      mediaPath: null,
      mediaName: null,
      draftAnswers: {},
      fieldConfidence: {},
      confidence: "low",
      aiModel: null,
      aiDraftedAt: null,
      awaitingReply: false,
      version: 1,
      updatedAt: o.receivedAt,
      ...o,
    };
    inbox.push(rec);
    return rec;
  };
  const draftOf = (text: string, when: Date) => rulesExtract({ text, now: when, fields: EYE_FIELDS });

  // A. Hinglish report from Mayur Vihar: most fields high, a few to check.
  {
    const when = at("2026-10-22", "11:40");
    const text = "Mayur Vihar eye camp kal ka report. 142 log aaye, 60 male 82 female, 96 chashme diye, 14 cataract mile";
    const r = draftOf(text, when);
    const conf = overallConfidence(r.fieldConfidence, true);
    const it = item(1, {
      senderHash: convA.phoneHash,
      senderEnc: convA.phoneEnc,
      senderMasked: convA.phoneMasked,
      conversationId: convA.id,
      scopeId: SAMITHI.mayurVihar,
      districtId: DISTRICT.east,
      receivedAt: when,
      rawKind: "text",
      rawText: text,
      eventId: EVENT.eyeMayurCamp,
      draftAnswers: r.answers,
      fieldConfidence: r.fieldConfidence,
      confidence: conf === "high" ? "check" : conf,
      aiModel: r.model,
      aiDraftedAt: when,
    });
    say(convA, "in", when, text, { inboxItemId: it.id });
    say(convA, "out", new Date(when.getTime() + 4000), pick("hi", COPY.sentToReview), { inboxItemId: it.id });
    hist(it.id, "ai_drafted", when, null, `AI draft (${r.model})`, "Message says 'kal' (taken as yesterday); mentions eye");
  }

  // B. Photo of a register, nothing else: asked which camp it is from.
  {
    const when = at("2026-10-21", "20:15");
    const it = item(2, {
      senderHash: convH.phoneHash,
      senderEnc: convH.phoneEnc,
      senderMasked: convH.phoneMasked,
      conversationId: convH.id,
      scopeId: SAMITHI.laxmiNagar,
      districtId: DISTRICT.east,
      receivedAt: when,
      rawKind: "image",
      mediaPath: "inbox/seed-register.png",
      mediaName: "register-photo.png",
      awaitingReply: true,
    });
    say(convH, "in", when, null, { kind: "image", mediaName: "register-photo.png", mediaMime: "image/png", mediaPath: "inbox/seed-register.png", inboxItemId: it.id });
    say(convH, "out", new Date(when.getTime() + 3000), pick("en", COPY.sentToReview), { inboxItemId: it.id });
    const asked = at("2026-10-22", "09:30");
    say(convH, "out", asked, "District coordinator B: Which camp is this register from?", { inboxItemId: it.id });
    hist(it.id, "asked", asked, "district_coord", "District coordinator B", "Which camp is this register from?");
  }

  // C. Spreadsheet placeholder (the uploads screen arrives with M6).
  {
    const it = item(3, {
      source: "upload",
      senderHash: convB.phoneHash,
      senderEnc: convB.phoneEnc,
      senderMasked: convB.phoneMasked,
      districtId: DISTRICT.east,
      receivedAt: at("2026-10-20", "15:00"),
      rawKind: "spreadsheet",
      mediaName: "east-district-camps-oct.xlsx",
    });
    hist(it.id, "ai_drafted", it.receivedAt, null, "Spreadsheet received", "Reading spreadsheets arrives with the uploads screen.");
  }

  // D. Escalated: a medical camp (no chat form yet), sent up by the district.
  {
    const when = at("2026-10-19", "13:05");
    const text = "Health camp Laxmi Nagar 18 Oct, 85 patients, 12 referred";
    const it = item(4, {
      senderHash: convH.phoneHash,
      senderEnc: convH.phoneEnc,
      senderMasked: convH.phoneMasked,
      conversationId: convH.id,
      scopeId: SAMITHI.laxmiNagar,
      districtId: DISTRICT.east,
      receivedAt: when,
      rawKind: "text",
      rawText: text,
      eventId: EVENT.medicalLaxmiOverdue,
      state: "escalated",
      aiModel: "rules",
      aiDraftedAt: when,
    });
    say(convH, "in", when, text, { inboxItemId: it.id });
    say(convH, "out", new Date(when.getTime() + 4000), pick("en", COPY.sentToReview), { inboxItemId: it.id });
    hist(it.id, "ai_drafted", when, null, "AI draft (rules)", "Message says 18 Oct; mentions medical");
    hist(it.id, "escalated", at("2026-10-20", "10:10"), "district_coord", "District coordinator B", "No chat form for medical camps yet; needs the state data team.");
  }

  // E. Done: approved after a district edit.
  {
    const when = at("2026-10-19", "18:20");
    const text = "Preet Vihar eye camp 15 Oct: 98 screened, 40 spectacles";
    const r = draftOf(text, when);
    const it = item(5, {
      senderHash: convI.phoneHash,
      senderEnc: convI.phoneEnc,
      senderMasked: convI.phoneMasked,
      conversationId: convI.id,
      scopeId: SAMITHI.preetVihar,
      districtId: DISTRICT.east,
      receivedAt: when,
      rawKind: "text",
      rawText: text,
      eventId: EVENT.eyePreetReport,
      draftAnswers: r.answers,
      fieldConfidence: Object.fromEntries(Object.keys(r.answers).map((k) => [k, { level: "high" as const, why: null }])),
      confidence: "high",
      state: "done",
      outcome: "approved",
      aiModel: r.model,
      aiDraftedAt: when,
      version: 3,
    });
    say(convI, "in", when, text, { inboxItemId: it.id });
    say(convI, "out", new Date(when.getTime() + 4000), pick("en", COPY.sentToReview), { inboxItemId: it.id });
    hist(it.id, "ai_drafted", when, null, `AI draft (${r.model})`, "Date written as 15 Oct");
    hist(it.id, "edited", at("2026-10-20", "09:40"), "district_coord", "District coordinator B", "Answers edited");
    hist(it.id, "approved", at("2026-10-20", "09:42"), "district_coord", "District coordinator B", "Eye screening camp, Preet Vihar");
  }

  // A public number mid-conversation, and a menu exchange for the district coordinator.
  convP.state = { flow: "near", step: "ask", data: {} };
  convP.expiresAt = at("2026-10-22", "10:30");
  say(convP, "in", at("2026-10-22", "10:00"), "menu");
  say(convP, "out", at("2026-10-22", "10:00"), pick("en", COPY.menuPublic));
  say(convP, "in", at("2026-10-22", "10:01"), "[m:near]", { payload: { replyId: "m:near" } });
  say(convP, "out", at("2026-10-22", "10:01"), pick("en", COPY.nearAsk));
  say(convB, "in", at("2026-10-22", "08:45"), "menu");
  say(convB, "out", at("2026-10-22", "08:45"), pick("en", COPY.menuCoordinator("District coordinator B")));

  const sevaSets: SevaType[][] = [["eye", "blood"], [], ["narayan_seva"], ["bal_vikas", "bhajan"], ["medical"], []];
  const districts = [DISTRICT.east, DISTRICT.east, DISTRICT.central, DISTRICT.south, DISTRICT.north, null, DISTRICT.east, DISTRICT.west, DISTRICT.noida, DISTRICT.east, DISTRICT.gurugram, DISTRICT.faridabad];
  const optIns: OptInRec[] = districts.map((districtId, i) => {
    const phone = `+9190010000${String(i + 1).padStart(2, "0")}`;
    const status: OptInRec["status"] = i === 10 ? "pending" : i === 11 ? "stopped" : "opted_in";
    return {
      id: fx("OPT", i + 1),
      phoneHash: phoneHash(secret, phone),
      phoneEnc: encryptField(secret, phone),
      phoneMasked: maskPhone(phone),
      districtId,
      sevaTypes: sevaSets[i % sevaSets.length],
      locale: i % 3 === 0 ? "hi" : "en",
      status,
      via: i % 4 === 3 ? "chat" : "web",
      requestedAt: at("2026-10-05", "12:00"),
      consentAt: status === "pending" ? null : at("2026-10-05", "12:02"),
      stoppedAt: status === "stopped" ? at("2026-10-15", "12:00") : null,
      ipHash: null,
    };
  });

  return {
    templates: templateRecords((n) => fx("WTP", n)).map((t) => ({ ...t, metaStatus: META_STATUS[t.name] ?? "pending" })),
    rules: DEFAULT_RULES.map((r, i) => ({ ...r, id: fx("RMR", i + 1) })),
    conversations: [...conversations.values()],
    messages,
    inbox,
    history,
    optIns,
  };
}
