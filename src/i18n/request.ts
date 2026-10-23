import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { loadOverrides } from "@/server/i18n/overrides";
import { routing } from "./routing";

type Tree = Record<string, unknown>;
const isTree = (v: unknown): v is Tree => typeof v === "object" && v !== null && !Array.isArray(v);
function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isTree(v) && isTree(out[k]) ? merge(out[k] as Tree, v) : v;
  return out;
}

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

  const shipped = (await import(`../../messages/${locale}.json`)).default as Tree;
  // Admin-edited UI strings (settings > strings). Never block rendering when the store is unavailable.
  const overrides = await loadOverrides(locale).catch(() => ({}));

  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: Object.keys(overrides).length ? merge(shipped, overrides) : shipped,
  };
});
