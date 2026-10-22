import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * The [locale] root param is known in every render under it, including the App Shell of
 * dynamic routes, so reading it never touches request headers (which would block
 * prerendering). Outside that tree (route handlers) fall back to next-intl's own lookup.
 */
async function resolveLocale(requestLocale: () => Promise<string | undefined>): Promise<string | undefined> {
  try {
    const fromRoot = await rootLocale();
    if (fromRoot) return fromRoot;
  } catch {
    // Not inside the [locale] segment.
  }
  return requestLocale();
}

// `params.requestLocale` is a getter that reads headers: only touch it as a last resort.
export default getRequestConfig(async (params) => {
  const requested = params.locale ?? (await resolveLocale(() => params.requestLocale));
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
