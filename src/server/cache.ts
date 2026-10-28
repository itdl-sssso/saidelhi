import "server-only";
import { revalidateTag } from "next/cache";

/** Cache tags for public data (contract §6). Tag cached reads with `cacheTag(CACHE_TAGS.events)`. */
export const CACHE_TAGS = {
  events: "events",
  impact: "impact",
  articles: "articles",
  centres: "centres",
  discourses: "discourses",
  home: "home",
  gallery: "gallery",
  uiStrings: "ui-strings",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Marks public data stale after a mutation (stale-while-revalidate, profile "max").
 * Safe to call from services: outside a Next request (scripts, tests) it is a no-op.
 */
export function revalidatePublic(tags: readonly CacheTag[]): void {
  for (const tag of new Set(tags)) {
    try {
      revalidateTag(tag, "max");
    } catch {
      // No Next.js request/static-generation store (seed scripts, vitest).
    }
  }
}
