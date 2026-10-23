// DEV-ONLY fixtures (see ../../devFixture.ts). Typed against the M4 contract; removed after integration.
import type { ConversationDetail, ConversationRow, OrgUnit, ReminderRule, WaStatus, WaTemplate } from "@/contract";

export const FIXTURE_TEMPLATES: WaTemplate[] = [
  { id: "t1", name: "login_code", category: "otp", text: { en: "Your code is {{1}}. It expires in 5 minutes. Never share it.", hi: "आपका कोड {{1}} है। यह 5 मिनट में समाप्त हो जाएगा। इसे किसी को न बताएँ।" }, metaStatus: "approved" },
  { id: "t2", name: "report_link", category: "link", text: { en: "Sai Ram {{1}}. Send the report for {{2}} here: {{3}}", hi: "साईं राम {{1}}। {{2}} की रिपोर्ट यहाँ भेजें: {{3}}" }, metaStatus: "approved" },
  { id: "t3", name: "report_reminder", category: "reminder", text: { en: "Sai Ram {{1}}. The report for {{2}} on {{3}} is still pending.", hi: null }, metaStatus: "pending" },
  { id: "t4", name: "plan_approved", category: "approval", text: { en: "Your plan for {{1}} was approved.", hi: "{{1}} के लिए आपकी योजना मंज़ूर हो गई।" }, metaStatus: "approved" },
  { id: "t5", name: "event_week", category: "broadcast", text: { en: "This week in {{1}}: {{2}}", hi: null }, metaStatus: "rejected" },
];

export const FIXTURE_REMINDERS: ReminderRule[] = [
  { id: "r1", key: "day_before", label: { en: "Day before the event", hi: "आयोजन से एक दिन पहले" }, description: { en: "Reminds the samithi coordinator the evening before.", hi: "शाम को समिति संयोजक को याद दिलाता है।" }, enabled: true, copyDistrict: false },
  { id: "r2", key: "day_after_no_report", label: { en: "Day after, if no report", hi: "अगले दिन, अगर रिपोर्ट नहीं आई" }, description: { en: "Sends the report link again.", hi: "रिपोर्ट का लिंक फिर भेजता है।" }, enabled: true, copyDistrict: false },
  { id: "r3", key: "plus3_no_report", label: { en: "After 3 days, if no report", hi: "3 दिन बाद, अगर रिपोर्ट नहीं आई" }, description: { en: "Also copied to the district coordinator.", hi: "जिला संयोजक को भी प्रति जाती है।" }, enabled: true, copyDistrict: true },
  { id: "r4", key: "plus7_no_report", label: { en: "After 7 days, if no report", hi: "7 दिन बाद, अगर रिपोर्ट नहीं आई" }, description: { en: "Final nudge, copied to the district coordinator.", hi: "आख़िरी याद दिलाना, जिला संयोजक को प्रति।" }, enabled: false, copyDistrict: true },
  { id: "r5", key: "approval_day2", label: { en: "Approval waiting 2 days", hi: "मंज़ूरी 2 दिन से लंबित" }, description: { en: "Nudges the approver.", hi: "मंज़ूर करने वाले को याद दिलाता है।" }, enabled: true, copyDistrict: false },
];

export const FIXTURE_DISTRICTS: OrgUnit[] = ["Central", "East", "New Delhi", "North", "South", "West", "Gurugram", "Noida–Ghaziabad", "Faridabad"].map((n, i) => ({
  id: `d${i}`,
  code: `D${i}`,
  kind: "district" as const,
  name: { en: n, hi: null },
  slug: n.toLowerCase().replace(/\W+/g, "-"),
  parentId: null,
  active: true,
}));

export const FIXTURE_LOG: ConversationRow[] = [
  { id: "c1", phone: "+91 98•••••52", who: { role: "samithi_coord", label: "Coordinator A" }, lastAt: "2026-10-23T09:14:00+05:30", lastText: "Report received, thank you.", messages: 12, locale: "en" },
  { id: "c2", phone: "+91 99•••••07", who: { role: null, label: "Public" }, lastAt: "2026-10-22T19:32:00+05:30", lastText: "What is happening near me this week?", messages: 4, locale: "hi" },
];

export const fixtureConversation = (id: string): ConversationDetail => ({
  ...(FIXTURE_LOG.find((c) => c.id === id) ?? FIXTURE_LOG[0]),
  thread: [
    { id: "m1", dir: "in", at: "2026-10-23T09:10:00+05:30", text: "Report", media: null },
    { id: "m2", dir: "out", at: "2026-10-23T09:10:05+05:30", text: "Which event is this report for?", media: null },
    { id: "m3", dir: "in", at: "2026-10-23T09:14:00+05:30", text: "Medical camp Shakarpur", media: null },
  ],
});

export const FIXTURE_STATUS: WaStatus = { provider: "console", number: "+91 11 4•••• ••21", coexistence: true, monthMessages: 1842, monthCostInr: 1120, optedIn: 312 };

export const FIXTURE_ESTIMATE = { recipients: 240, estimatedCostInr: 190, sent: false, broadcastId: null };
