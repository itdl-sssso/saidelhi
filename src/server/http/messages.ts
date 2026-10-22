import type { ErrorCode, Locale } from "@/contract";
import type { z } from "zod";

const MESSAGES: Record<ErrorCode, Record<Locale, string>> = {
  BAD_REQUEST: { en: "The request could not be understood.", hi: "अनुरोध समझा नहीं जा सका।" },
  UNAUTHENTICATED: { en: "Please sign in again.", hi: "कृपया दोबारा साइन इन करें।" },
  FORBIDDEN: { en: "You don't have access to this.", hi: "आपके पास इसकी अनुमति नहीं है।" },
  PHONE_NOT_LISTED: { en: "This number is not listed for this form.", hi: "यह नंबर इस फ़ॉर्म के लिए सूचीबद्ध नहीं है।" },
  NOT_FOUND: { en: "We couldn't find that.", hi: "यह नहीं मिला।" },
  CONFLICT: { en: "This changed while you were editing.", hi: "आपके संपादन के दौरान यह बदल गया।" },
  LINK_EXPIRED: { en: "This link has expired.", hi: "यह लिंक समाप्त हो गया है।" },
  LINK_REVOKED: { en: "This link is no longer active.", hi: "यह लिंक अब सक्रिय नहीं है।" },
  LINK_USED_UP: { en: "This link has already been used.", hi: "यह लिंक पहले ही उपयोग हो चुका है।" },
  VALIDATION_FAILED: { en: "Please check the highlighted fields.", hi: "कृपया चिह्नित फ़ील्ड जाँचें।" },
  LOCKED: { en: "Too many attempts. Please wait and try again.", hi: "बहुत अधिक प्रयास। कृपया कुछ देर बाद फिर कोशिश करें।" },
  RATE_LIMITED: { en: "Too many requests. Please try again shortly.", hi: "बहुत अधिक अनुरोध। कृपया थोड़ी देर बाद फिर कोशिश करें।" },
  PROVIDER_UNAVAILABLE: { en: "The service is unavailable right now.", hi: "सेवा अभी उपलब्ध नहीं है।" },
  INTERNAL: { en: "Something went wrong on our side.", hi: "हमारी ओर से कुछ गड़बड़ हो गई।" },
};

export const errorMessage = (code: ErrorCode, locale: Locale) => MESSAGES[code][locale];

const HI_ISSUE: Record<string, string> = {
  invalid_type: "यह आवश्यक है।",
  too_small: "यह बहुत छोटा है।",
  too_big: "यह बहुत लंबा है।",
  invalid_format: "प्रारूप सही नहीं है।",
  invalid_value: "कृपया मान्य विकल्प चुनें।",
  invalid_union: "यह मान मान्य नहीं है।",
};

/** zod issues → `fields` map (first issue per path), in the request locale. */
export function issuesToFields(issues: readonly z.core.$ZodIssue[], locale: Locale): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_";
    if (key in fields) continue;
    fields[key] = locale === "hi" ? (HI_ISSUE[issue.code] ?? "यह मान मान्य नहीं है।") : issue.message;
  }
  return fields;
}
