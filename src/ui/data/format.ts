import type { PublicCount } from "./types";

/** Indian digit grouping (1,23,456) in both languages, Latin digits. */
export function formatCount(n: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-IN`, { numberingSystem: "latn" }).format(n);
}

export function isSuppressed(v: PublicCount): v is { lt5: true } {
  return typeof v === "object";
}

/** Numeric value used for chart geometry; suppressed counts plot as 2.5 (midpoint of 0–4). */
export function plotValue(v: PublicCount | null): number {
  if (v === null) return 0;
  return isSuppressed(v) ? 2.5 : v;
}
