import type { Metadata } from "next";
import type { AppLocale } from "@/lib/format";

/**
 * Canonical URL + hreflang alternates for a public page. English is unprefixed and Hindi lives
 * under /hi, so every public path has exactly one twin. Paths are relative; the locale layout's
 * `metadataBase` (APP_URL) makes them absolute. Query strings (filters, paging) are left out on
 * purpose so filtered views point at the base page.
 */
export function pageAlternates(locale: AppLocale | string, path: string): NonNullable<Metadata["alternates"]> {
  const p = path === "/" ? "" : path.replace(/\/$/, "");
  const en = p || "/";
  const hi = `/hi${p}`;
  return { canonical: locale === "hi" ? hi : en, languages: { en, hi, "x-default": en } };
}

/**
 * Meta description trimmed for search snippets: whitespace collapsed, cut at a word boundary to at
 * most `max` characters. Returns undefined for empty input so the layout default applies.
 */
export function metaDescription(text: string | null | undefined, max = 160): string | undefined {
  const s = (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return undefined;
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.–-]+$/, "")}…`;
}
