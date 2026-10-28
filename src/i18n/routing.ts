import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "hi"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
  // The middleware's hreflang `link` header gets appended to cached prerendered responses on every hit in prod
  // (grew to 10 KB+ → nginx 502 "upstream sent too big header"). hreflang lives in sitemap.xml instead.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
