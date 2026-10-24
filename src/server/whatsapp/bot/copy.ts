// Bot copy, English and Hindi (spec 50). Free-form replies need no Meta
// approval (they are sent inside the 24-hour window after the person writes);
// the templates in providers/whatsapp/templates.ts are the ones Meta must approve.
import type { EventStatus, Locale } from "@/contract";

export type Bi = { en: string; hi: string };
export const pick = (l: Locale, b: Bi): string => (l === "hi" ? b.hi : b.en);
const b = (en: string, hi: string): Bi => ({ en, hi });

/** Button / list-row titles must stay short (WhatsApp limits: 20 / 24 chars). */
export const LABEL = {
  english: b("English", "English"),
  hindi: b("हिन्दी", "हिन्दी"),
  menu: b("Menu", "मेनू"),
  plan: b("Plan an activity", "गतिविधि की योजना"),
  report: b("Report totals", "आँकड़े भेजें"),
  events: b("My events", "मेरे कार्यक्रम"),
  help: b("Help", "मदद"),
  approvals: b("Approvals", "स्वीकृतियाँ"),
  near: b("What's on near me", "मेरे पास क्या है"),
  join: b("Join updates", "अपडेट पाएँ"),
  contact: b("Contact a centre", "केंद्र से संपर्क"),
  confirm: b("Confirm", "पक्का करें"),
  edit: b("Edit", "बदलें"),
  cancel: b("Cancel", "रद्द करें"),
  skip: b("Skip", "छोड़ें"),
  today: b("Today", "आज"),
  tomorrow: b("Tomorrow", "कल"),
  pick: b("Pick a date", "तारीख़ चुनें"),
  approve: b("Approve", "स्वीकृत करें"),
  reject: b("Reject", "अस्वीकार करें"),
  ask: b("Ask", "पूछें"),
  human: b("Talk to a person", "व्यक्ति से बात"),
  yes: b("Yes", "हाँ"),
  no: b("No", "नहीं"),
  choose: b("Choose", "चुनें"),
} as const;

export const STATUS_LABEL: Record<EventStatus, Bi> = {
  draft: b("Draft", "मसौदा"),
  awaiting_approval: b("Waiting for approval", "स्वीकृति की प्रतीक्षा"),
  planned: b("Planned", "निर्धारित"),
  postponed: b("Postponed", "स्थगित"),
  awaiting_report: b("Waiting for report", "रिपोर्ट की प्रतीक्षा"),
  report_submitted: b("Report sent", "रिपोर्ट भेजी गई"),
  approved: b("Approved", "स्वीकृत"),
  cancelled: b("Cancelled", "रद्द"),
  escalated: b("With the state team", "राज्य टीम के पास"),
};

export const COPY = {
  askLanguage: b("Please choose your language.\nकृपया अपनी भाषा चुनें।", "Please choose your language.\nकृपया अपनी भाषा चुनें।"),
  languageSet: b("Language set to English. You can change it any time by sending \"language\".", "भाषा हिन्दी पर सेट हो गई। कभी भी \"भाषा\" लिखकर बदल सकते हैं।"),
  menuCoordinator: (name: string) => b(`Hello ${name}. What would you like to do?`, `नमस्ते ${name}। आप क्या करना चाहेंगे?`),
  menuPublic: b(
    "Namaste. This is Sri Sathya Sai Seva Organisation, Delhi NCR. How can we help?",
    "नमस्ते। यह श्री सत्य साई सेवा संगठन, दिल्ली एनसीआर है। हम कैसे मदद करें?",
  ),
  menuButton: b("Open menu", "मेनू खोलें"),
  /** Short prompt after a flow ends; the full help text is only for the Help button. */
  menuNext: b("What would you like to do next?", "अब आप आगे क्या करना चाहेंगे?"),
  /** Help for a coordinator who cannot approve (samithi coordinator). */
  help: b(
    "I can help you plan an activity, send its report and see your events. Send \"menu\" any time to start again.",
    "मैं गतिविधि की योजना बनाने, उसकी रिपोर्ट भेजने और आपके कार्यक्रम देखने में मदद कर सकता हूँ। दोबारा शुरू करने के लिए कभी भी \"menu\" लिखें।",
  ),
  helpApprover: b(
    "I can help you plan an activity, send its report, see your events and approve plans. Send \"menu\" any time to start again.",
    "मैं गतिविधि की योजना बनाने, उसकी रिपोर्ट भेजने, आपके कार्यक्रम देखने और योजनाएँ स्वीकृत करने में मदद कर सकता हूँ। दोबारा शुरू करने के लिए कभी भी \"menu\" लिखें।",
  ),
  helpPublic: b(
    "I can show what's on near you, sign you up for updates, or share a centre's number. Send \"menu\" any time.",
    "मैं आपके पास के कार्यक्रम दिखा सकता हूँ, अपडेट के लिए जोड़ सकता हूँ या केंद्र का नंबर दे सकता हूँ। कभी भी \"menu\" लिखें।",
  ),
  handoff: b("A coordinator will reply here soon. Thank you for your patience.", "कोई समन्वयक जल्द ही यहीं जवाब देंगे। धैर्य के लिए धन्यवाद।"),
  unrecognised: b("Sorry, I didn't understand that. Please choose one of these.", "क्षमा करें, मैं समझ नहीं पाया। कृपया इनमें से चुनें।"),
  unrecognisedAgain: b("I still didn't get that. Would you like to talk to a person?", "मैं अब भी समझ नहीं पाया। क्या आप किसी व्यक्ति से बात करना चाहेंगे?"),
  timeout: b("It has been quiet for a while, so let's start again.", "कुछ देर से कोई संदेश नहीं आया, इसलिए चलिए फिर से शुरू करते हैं।"),
  cancelled: b("Okay, cancelled.", "ठीक है, रद्द कर दिया।"),
  notAllowed: b("Your number can't do that. Please ask your district coordinator.", "आपका नंबर यह नहीं कर सकता। कृपया अपने ज़िला समन्वयक से पूछें।"),
  trouble: b("Something went wrong on our side. Please try again in a moment.", "हमारी ओर से कुछ गड़बड़ हो गई। कृपया थोड़ी देर में फिर कोशिश करें।"),
  sentToReview: b(
    "Thanks, we've sent this to your district to check. A person approves it before it counts.",
    "धन्यवाद, हमने इसे जाँच के लिए आपके ज़िले को भेज दिया है। गिने जाने से पहले कोई व्यक्ति इसे स्वीकृत करता है।",
  ),
  replyForwarded: b("Thanks, your reply has been passed on.", "धन्यवाद, आपका जवाब आगे भेज दिया गया है।"),

  // Plan
  planSeva: b("What kind of seva are you planning?", "आप किस तरह की सेवा की योजना बना रहे हैं?"),
  planSamithi: b("Which samithi is this for? Send its name.", "यह किस समिति के लिए है? उसका नाम भेजें।"),
  planSamithiNo: (names: string) => b(`I couldn't find that samithi. Try one of: ${names}.`, `वह समिति नहीं मिली। इनमें से कोई लिखें: ${names}।`),
  planDate: b("When will it be?", "यह कब होगा?"),
  planDatePick: b("Send the date, for example 25 Oct or 25/10.", "तारीख़ भेजें, जैसे 25 अक्टूबर या 25/10।"),
  planDateBad: b("I couldn't read that date. Try 25 Oct or 25/10.", "वह तारीख़ समझ नहीं आई। 25 अक्टूबर या 25/10 लिखकर देखें।"),
  planDatePast: b("That date has passed. Send a date from today onwards.", "वह तारीख़ बीत चुकी है। आज या उसके बाद की तारीख़ भेजें।"),
  planTime: b("What time does it start? For example 9 am or 17:30.", "यह कब शुरू होगा? जैसे सुबह 9 बजे या 17:30।"),
  planTimeBad: b("I couldn't read that time. Try 9 am or 17:30.", "वह समय समझ नहीं आया। सुबह 9 बजे या 17:30 लिखकर देखें।"),
  planVenue: b("Where will it be? Send the venue name.", "यह कहाँ होगा? स्थान का नाम भेजें।"),
  planVenueBad: b("Please send the venue name (at least 2 letters).", "कृपया स्थान का नाम भेजें (कम से कम 2 अक्षर)।"),
  planVolunteers: b("How many Sevadal do you need? Send a number, or Skip.", "कितने सेवादल चाहिए? संख्या भेजें, या छोड़ें।"),
  planVolunteersBad: b("Please send a whole number from 0 to 10000, or Skip.", "कृपया 0 से 10000 के बीच पूरी संख्या भेजें, या छोड़ें।"),
  planPartner: b("Is there a partner, for example a hospital? Send its name, or Skip.", "क्या कोई साझेदार है, जैसे अस्पताल? उसका नाम भेजें, या छोड़ें।"),
  planNeedsEdit: b("Something needs fixing:", "कुछ ठीक करना होगा:"),
  planSent: (district: string) => b(`Sent to ${district} district for approval. We'll message you when they decide.`, `${district} ज़िले को स्वीकृति के लिए भेज दिया गया। निर्णय होते ही हम आपको बताएँगे।`),
  planApproved: b("Done. As district coordinator your plan is approved. The report link will arrive on WhatsApp.", "हो गया। ज़िला समन्वयक के रूप में आपकी योजना स्वीकृत है। रिपोर्ट लिंक WhatsApp पर आएगा।"),

  // Report
  reportPickEvent: b("Which activity are you reporting?", "आप किस गतिविधि की रिपोर्ट भेज रहे हैं?"),
  reportNone: b("No activity is waiting for a report right now.", "अभी किसी गतिविधि की रिपोर्ट बाकी नहीं है।"),
  reportNoForm: (url: string) => b(`There is no chat form for this activity yet. Please use the form link: ${url}`, `इस गतिविधि के लिए चैट फ़ॉर्म अभी नहीं है। कृपया फ़ॉर्म लिंक का उपयोग करें: ${url}`),
  reportIntro: (title: string) => b(`Reporting: ${title}. I'll ask one question at a time. Send "cancel" to stop.`, `रिपोर्ट: ${title}। मैं एक-एक करके सवाल पूछूँगा। रोकने के लिए "cancel" लिखें।`),
  reportQuestion: (n: number, total: number, label: string, help: string | null, optional: boolean) =>
    b(
      `${n}/${total}. ${label}?${help ? ` (${help})` : ""} Send a number${optional ? ", or Skip" : ""}.`,
      `${n}/${total}. ${label}?${help ? ` (${help})` : ""} संख्या भेजें${optional ? ", या छोड़ें" : ""}।`,
    ),
  reportNumberBad: (min: number | null, max: number | null) =>
    b(
      `Please send a whole number${max !== null ? ` between ${min ?? 0} and ${max}` : ` of ${min ?? 0} or more`}.`,
      `कृपया पूरी संख्या भेजें${max !== null ? ` (${min ?? 0} से ${max} के बीच)` : ` (${min ?? 0} या अधिक)`}।`,
    ),
  reportPhoto: b("Photo received. Kept private. ID numbers are never read.", "फ़ोटो मिल गई। इसे निजी रखा जाता है। पहचान संख्याएँ कभी नहीं पढ़ी जातीं।"),
  reportSummary: (title: string, lines: string) => b(`Please check your report for ${title}:\n${lines}\nSend it?`, `${title} की रिपोर्ट जाँच लें:\n${lines}\nभेज दें?`),
  reportFix: b("Please fix this before sending:", "भेजने से पहले इसे ठीक करें:"),
  reportDone: (district: string) => b(`Report sent to ${district} district for approval. Thank you for your seva.`, `रिपोर्ट स्वीकृति के लिए ${district} ज़िले को भेज दी गई। आपकी सेवा के लिए धन्यवाद।`),
  reportFull: (url: string) => b(`This report needs details I can't take in chat. Please finish it in the form: ${url}`, `इस रिपोर्ट में ऐसी जानकारी चाहिए जो चैट में नहीं ली जा सकती। कृपया फ़ॉर्म में पूरा करें: ${url}`),
  reportAlready: b("A report was already sent for this activity.", "इस गतिविधि की रिपोर्ट पहले ही भेजी जा चुकी है।"),

  // My events
  eventsNone: b("You have no recent activities yet. Send \"plan\" to add one.", "आपकी अभी कोई हाल की गतिविधि नहीं है। जोड़ने के लिए \"plan\" लिखें।"),
  eventsHead: b("Your latest activities:", "आपकी हाल की गतिविधियाँ:"),

  // Approvals
  approvalsNone: b("Nothing is waiting for your approval.", "आपकी स्वीकृति के लिए कुछ बाकी नहीं है।"),
  approvalsPick: b("These are waiting for you. Choose one.", "ये आपकी प्रतीक्षा में हैं। एक चुनें।"),
  approvedOk: b("Approved. Thank you.", "स्वीकृत हो गया। धन्यवाद।"),
  alreadyDecided: b("That one was already decided.", "इस पर पहले ही निर्णय हो चुका है।"),
  rejectWhy: b("Why are you sending it back? Send a short reason.", "इसे वापस क्यों भेज रहे हैं? संक्षिप्त कारण लिखें।"),
  rejectDone: b("Sent back with your reason.", "आपके कारण के साथ वापस भेज दिया गया।"),
  askWhat: b("What would you like to ask? Send your question.", "आप क्या पूछना चाहेंगे? अपना सवाल भेजें।"),
  askSent: b("Your question was sent.", "आपका सवाल भेज दिया गया।"),
  askNoPhone: b("I couldn't reach them on WhatsApp. Please call or use the portal.", "मैं उन तक WhatsApp पर नहीं पहुँच सका। कृपया फ़ोन करें या पोर्टल का उपयोग करें।"),
  askForwarded: (who: string, text: string) => b(`Reply from ${who}: ${text}`, `${who} का जवाब: ${text}`),

  // Public
  nearAsk: b("Send your pincode or district name and I'll show what's on.", "अपना पिनकोड या ज़िले का नाम भेजें, मैं बताऊँगा कि क्या हो रहा है।"),
  nearNone: b("I couldn't find an upcoming activity there. Try another pincode or district.", "वहाँ कोई आगामी गतिविधि नहीं मिली। दूसरा पिनकोड या ज़िला आज़माएँ।"),
  nearHead: (place: string) => b(`Coming up in ${place}:`, `${place} में आने वाले कार्यक्रम:`),
  nearUnknown: b("I couldn't match that place. Send a 6-digit pincode or a district name.", "वह जगह समझ नहीं आई। 6 अंकों का पिनकोड या ज़िले का नाम भेजें।"),
  joinAsk: b(
    "Want seva updates on WhatsApp? We'll only message you about activities, and you can send STOP any time.",
    "WhatsApp पर सेवा अपडेट चाहिए? हम केवल गतिविधियों के बारे में संदेश भेजेंगे, और आप कभी भी STOP लिख सकते हैं।",
  ),
  joinDistrict: b("Which district? Send its name, or Skip for all of Delhi NCR.", "कौन सा ज़िला? उसका नाम भेजें, या पूरे दिल्ली एनसीआर के लिए छोड़ें।"),
  joinDone: b("You're on the list. Send STOP any time to stop the updates.", "आप सूची में हैं। अपडेट रोकने के लिए कभी भी STOP लिखें।"),
  joinDeclined: b("No problem. Nothing was saved.", "कोई बात नहीं। कुछ भी सहेजा नहीं गया।"),
  contactAsk: b("Send your pincode, area or district and I'll find the nearest centre.", "अपना पिनकोड, इलाका या ज़िला भेजें, मैं निकटतम केंद्र ढूँढूँगा।"),
  contactNone: b("I couldn't find a centre there. Try another area.", "वहाँ कोई केंद्र नहीं मिला। दूसरा इलाका आज़माएँ।"),
  contactHead: b("Nearest centres:", "निकटतम केंद्र:"),
  optInThanks: b("Thank you. You'll get seva updates here. Send STOP any time to stop.", "धन्यवाद। आपको यहाँ सेवा अपडेट मिलेंगे। रोकने के लिए कभी भी STOP लिखें।"),
  optOutDone: b("Stopped. You won't get updates. Send YES any time to start again.", "रोक दिया गया। आपको अपडेट नहीं मिलेंगे। फिर शुरू करने के लिए कभी भी YES लिखें।"),
} as const;
