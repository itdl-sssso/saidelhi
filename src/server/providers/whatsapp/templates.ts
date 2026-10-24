// Template catalogue (docs/whatsapp-setup.md §5). Bodies mirror what is submitted
// to Meta for approval; {{n}} are positional parameters. The console provider
// renders them so dev logs read like the real messages.
import type { I18nText } from "@/contract";

export type TemplateCategory = "authentication" | "utility" | "marketing";

export interface TemplateDef {
  name: string;
  category: TemplateCategory;
  params: number;
  body: I18nText & { hi: string };
  /**
   * Quick-reply buttons (need Meta approval together with the body). The tap
   * returns `ap:<verb>:<ref>`, where `ref` is passed at send time (SendMeta.buttonRef).
   */
  quickReplies?: readonly { verb: "yes" | "no" | "ask"; title: I18nText & { hi: string } }[];
}

const def = (name: string, category: TemplateCategory, params: number, en: string, hi: string): TemplateDef => ({
  name,
  category,
  params,
  body: { en, hi },
});

export const WHATSAPP_TEMPLATES = {
  login_code: def(
    "login_code",
    "authentication",
    1,
    "Your code is {{1}}. It expires in 5 minutes. Never share it.",
    "आपका कोड {{1}} है। यह 5 मिनट में समाप्त हो जाएगा। इसे कभी किसी से साझा न करें।",
  ),
  plan_approval_request: def(
    "plan_approval_request",
    "utility",
    3,
    "New plan for approval: {{1}} on {{2}} at {{3}}. Tap a button below.",
    "स्वीकृति के लिए नई योजना: {{1}}, {{2}} को {{3}} में। नीचे दिया बटन दबाएँ।",
  ),
  report_approval_request: def(
    "report_approval_request",
    "utility",
    2,
    "Report received for {{1}}: {{2}}. Tap a button below.",
    "{{1}} की रिपोर्ट मिली: {{2}}। नीचे दिया बटन दबाएँ।",
  ),
  form_link_sent: def(
    "form_link_sent",
    "utility",
    3,
    "{{1}} for {{2}}: {{3}} This link is only for you. Please don't forward it.",
    "{{2}} के लिए {{1}}: {{3}} यह लिंक केवल आपके लिए है। कृपया इसे आगे न भेजें।",
  ),
  event_reminder_day_before: def(
    "event_reminder_day_before",
    "utility",
    2,
    "Tomorrow: {{1}} at {{2}}. Checklist and form links are in your earlier message.",
    "कल: {{1}}, {{2}} में। चेकलिस्ट और फ़ॉर्म लिंक आपके पिछले संदेश में हैं।",
  ),
  report_reminder: def(
    "report_reminder",
    "utility",
    2,
    "How did {{1}} go? Report here: {{2}}",
    "{{1}} कैसा रहा? यहाँ रिपोर्ट करें: {{2}}",
  ),
  escalation_notice: def(
    "escalation_notice",
    "utility",
    2,
    "{{1}} has waited 3 days for district approval and has been passed to the state team: {{2}}",
    "{{1}} ज़िला स्वीकृति के लिए 3 दिन से रुका है और राज्य टीम को भेजा गया है: {{2}}",
  ),
  invite_coordinator: def(
    "invite_coordinator",
    "utility",
    2,
    "You've been added as {{1}} on the Sai Seva Delhi NCR portal. Sign in: {{2}}",
    "आपको साई सेवा दिल्ली एनसीआर पोर्टल पर {{1}} के रूप में जोड़ा गया है। साइन इन करें: {{2}}",
  ),
  volunteer_reminder: def(
    "volunteer_reminder",
    "utility",
    2,
    "You're down for {{1}} tomorrow at {{2}}. Thank you.",
    "आप कल {{2}} में {{1}} के लिए शामिल हैं। धन्यवाद।",
  ),
  volunteer_signup_alert: def(
    "volunteer_signup_alert",
    "utility",
    3,
    "New Sevadal for {{1}}: {{2}} of {{3}} spots filled. See names in the portal.",
    "{{1}} के लिए नया सेवादल: {{3}} में से {{2}} स्थान भरे। नाम पोर्टल में देखें।",
  ),
  privacy_reply: def(
    "privacy_reply",
    "utility",
    1,
    "Sai Seva Delhi NCR, about your privacy request: {{1}}",
    "साई सेवा दिल्ली एनसीआर, आपके गोपनीयता अनुरोध के बारे में: {{1}}",
  ),
  monthly_report_ready: def(
    "monthly_report_ready",
    "utility",
    2,
    "The {{1}} seva report is ready: {{2}}",
    "{{1}} की सेवा रिपोर्ट तैयार है: {{2}}",
  ),
  seva_broadcast: def(
    "seva_broadcast",
    "marketing",
    2,
    "{{1}}: {{2}} Reply STOP to stop these messages.",
    "{{1}}: {{2}} ये संदेश बंद करने के लिए STOP लिखें।",
  ),
  optin_confirm: def(
    "optin_confirm",
    "utility",
    1,
    "Sai Seva Delhi NCR: {{1}} Reply YES to get seva updates on WhatsApp. Reply STOP any time to stop.",
    "साई सेवा दिल्ली एनसीआर: {{1}} WhatsApp पर सेवा अपडेट पाने के लिए YES लिखें। रोकने के लिए कभी भी STOP लिखें।",
  ),
  plan_decision: def(
    "plan_decision",
    "utility",
    2,
    "Your plan {{1}}: {{2}}",
    "आपकी योजना {{1}}: {{2}}",
  ),
  review_message: def(
    "review_message",
    "utility",
    1,
    "About the report you sent: {{1}} Reply here to answer.",
    "आपने जो रिपोर्ट भेजी उसके बारे में: {{1}} जवाब यहीं दें।",
  ),
} as const satisfies Record<string, TemplateDef>;

const yes = { verb: "yes", title: { en: "Approve", hi: "स्वीकृत करें" } } as const;
const no = { verb: "no", title: { en: "Reject", hi: "अस्वीकार करें" } } as const;
const ask = { verb: "ask", title: { en: "Ask", hi: "पूछें" } } as const;
const changes = { verb: "no", title: { en: "Request changes", hi: "बदलाव माँगें" } } as const;

/** Quick-reply buttons per template (kept apart so the catalogue above stays plain data). */
const QUICK_REPLIES: Partial<Record<keyof typeof WHATSAPP_TEMPLATES, NonNullable<TemplateDef["quickReplies"]>>> = {
  plan_approval_request: [yes, no, ask],
  report_approval_request: [yes, changes],
};

/** Buttons a template carries for one send, as the simulator and log show them. `ref` is the event id. */
export function templateButtons(name: TemplateName, lang: "en" | "hi", ref: string | undefined): { id: string; title: string }[] | null {
  const q = QUICK_REPLIES[name];
  if (!q || !ref) return null;
  return q.map((b) => ({ id: `ap:${b.verb}:${ref}`, title: b.title[lang].slice(0, 20) }));
}

/**
 * Estimated Meta price per delivered message in paise (India, utility and
 * authentication ≈ ₹0.115, marketing ≈ ₹0.78). Free-form replies inside the
 * 24-hour window are free. Adjust here when Meta changes its rate card.
 */
export const COST_PAISE_PER_MESSAGE = { authentication: 12, utility: 12, marketing: 78 } as const satisfies Record<TemplateCategory, number>;

export const templateCostPaise = (name: TemplateName): number => COST_PAISE_PER_MESSAGE[WHATSAPP_TEMPLATES[name].category];

export type TemplateName = keyof typeof WHATSAPP_TEMPLATES;

export function renderTemplate(name: TemplateName, lang: "en" | "hi", params: readonly string[]): string {
  return WHATSAPP_TEMPLATES[name].body[lang].replace(/\{\{(\d+)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? "");
}
