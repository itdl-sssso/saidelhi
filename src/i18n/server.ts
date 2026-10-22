import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "./routing";

/**
 * Reads the [locale] root param, 404s unknown values and enables static rendering for the segment.
 * Root params are shared by the whole tree, so reading them never blocks an instant navigation.
 */
export async function initLocale(): Promise<Locale> {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}
