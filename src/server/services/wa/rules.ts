// Reminder-rule and template catalogues (spec 42): the defaults an environment
// starts with. Admin screens and the cron job read them through the repository.
import type { I18nText, WaTemplateCategory } from "@/contract";
import { newId } from "../../db/columns";
import { WHATSAPP_TEMPLATES, type TemplateName } from "../../providers/whatsapp/templates";
import type { ReminderRuleRec, WaRepo, WaTemplateRec } from "../../repo/wa-types";

const b = (en: string, hi: string): I18nText => ({ en, hi });

/** Reminder rules honoured by the cron job (spec 42). */
export const DEFAULT_RULES: readonly Omit<ReminderRuleRec, "id">[] = [
  { key: "day_before", label: b("Day before the event", "कार्यक्रम से एक दिन पहले"), description: b("Checklist reminder to the samithi coordinator.", "समिति समन्वयक को चेकलिस्ट की याद।"), enabled: true, copyDistrict: false },
  { key: "day_after_no_report", label: b("Day after, if no report", "अगले दिन, यदि रिपोर्ट नहीं"), description: b("Asks for the report with its form link.", "रिपोर्ट माँगता है और फ़ॉर्म लिंक भेजता है।"), enabled: true, copyDistrict: false },
  { key: "plus3_no_report", label: b("+3 days, copy district", "+3 दिन, ज़िले को प्रति"), description: b("Second reminder; the district coordinator is copied.", "दूसरी याद; ज़िला समन्वयक को प्रति जाती है।"), enabled: true, copyDistrict: true },
  { key: "plus7_no_report", label: b("+7 days, copy district", "+7 दिन, ज़िले को प्रति"), description: b("Last reminder; the district coordinator is copied.", "आख़िरी याद; ज़िला समन्वयक को प्रति जाती है।"), enabled: true, copyDistrict: true },
  { key: "approval_day2", label: b("Approval waiting, day 2", "स्वीकृति लंबित, दूसरा दिन"), description: b("Reminds the district before the plan passes to the state team.", "योजना राज्य टीम को जाने से पहले ज़िले को याद दिलाता है।"), enabled: true, copyDistrict: false },
];

const RULE_ORDER = DEFAULT_RULES.map((r) => r.key as string);
const inOrder = (rules: ReminderRuleRec[]) => [...rules].sort((a, b) => RULE_ORDER.indexOf(a.key) - RULE_ORDER.indexOf(b.key));

/** Reminder rules in display order, creating the defaults the first time (all enabled). */
export async function loadReminderRules(wa: WaRepo): Promise<ReminderRuleRec[]> {
  const existing = await wa.reminderRules();
  const have = new Set(existing.map((r) => r.key));
  if (DEFAULT_RULES.every((d) => have.has(d.key))) return inOrder(existing);
  for (const d of DEFAULT_RULES) if (!have.has(d.key)) await wa.upsertReminderRule({ ...d, id: newId() });
  return inOrder(await wa.reminderRules());
}

export const TEMPLATE_CATEGORY: Record<TemplateName, WaTemplateCategory> = {
  login_code: "otp",
  plan_approval_request: "approval",
  report_approval_request: "approval",
  plan_decision: "approval",
  escalation_notice: "approval",
  form_link_sent: "link",
  event_reminder_day_before: "reminder",
  report_reminder: "reminder",
  volunteer_reminder: "reminder",
  seva_broadcast: "broadcast",
  invite_coordinator: "general",
  optin_confirm: "general",
  review_message: "general",
};

/** Every template in the catalogue as stored records (Meta status "pending" until approved). */
export function templateRecords(id: (n: number) => string = () => newId()): WaTemplateRec[] {
  return Object.entries(WHATSAPP_TEMPLATES).map(([name, def], i) => ({
    id: id(i + 1),
    name,
    category: TEMPLATE_CATEGORY[name as TemplateName],
    textEn: def.body.en,
    textHi: def.body.hi,
    metaStatus: "pending",
  }));
}
