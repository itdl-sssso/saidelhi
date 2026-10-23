import "server-only";
import { cacheTag } from "next/cache";
import type { Locale } from "@/contract";
import { CACHE_TAGS } from "../cache";
import { services } from "../services";
import { type Flat, unflatten } from "./messages";

/**
 * Admin-edited UI strings for one language as a nested messages object, ready to
 * deep-merge over `messages/<locale>.json` in the next-intl request config.
 * Cached; the strings PATCH route revalidates tag `ui-strings`.
 */
export async function loadOverrides(locale: Locale): Promise<Record<string, unknown>> {
  "use cache";
  cacheTag(CACHE_TAGS.uiStrings);
  const flat: Flat = await services().portal.settings.overrides(locale);
  return unflatten(flat);
}
