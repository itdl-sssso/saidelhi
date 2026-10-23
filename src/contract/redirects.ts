// v0.6 (M5): legacy saidelhi.org URL → new path. Pure rules, shared by src/proxy.ts (301s),
// GET /redirects and the "This page moved" 404 (spec 18). The `redirect` table (manual /
// migration rows, M6 admin) is consulted first by the server; these rules are the fallback.
// Legacy routes (saidelhiweb/urls.py): about-us, contact-us, get-involved, wings/<name>,
// content/<Name>/getallposts, content/<slug>, book-auditorium, saidelhi-backend (Django admin).
import { z } from "zod";
import type { ArticleCategoryFilter, Wing } from "./enums";

export const RedirectQuery = z.object({ path: z.string().trim().min(1).max(500) });
export type RedirectQuery = z.infer<typeof RedirectQuery>;

/** GET /redirects?path= → 200 `RedirectTarget` | 404 when no rule/row matches. */
export const RedirectTarget = z.object({
  /** Unlocalised new path (+query), e.g. `/news/some-slug`, `/news?c=activities`. */
  to: z.string(),
  /** true → 301 (all legacy rules); false → 302 (temporary manual rows). */
  permanent: z.boolean(),
});
export type RedirectTarget = z.infer<typeof RedirectTarget>;

/** Django `CATEGORY_SLUGS` matched on first letter (as the old view did). */
const LEGACY_LIST_CATEGORY: Record<string, ArticleCategoryFilter> = {
  C: "centenary",
  D: "centenary",
  P: "stories",
  S: "special_programs",
  A: "activities",
  K: "key_programs",
  N: "news",
};

const LEGACY_WING: Record<string, Wing> = { spiritual: "spiritual", service: "service", education: "educational", educational: "educational" };

/** Paths the old Django site served (used to decide "moved" vs plain 404). */
export const LEGACY_PATH = /^\/(?:about-us|contact-us|get-involved|book-auditorium|wings|content|saidelhi-backend|images\/upload|tinymce)(?:\/|$)/i;

export function isLegacyPath(path: string): boolean {
  return LEGACY_PATH.test(path);
}

/**
 * Rule-based target for a legacy path (query string ignored), or null.
 * Decisions (see docs/progress/M5-plan.md "User questions"): contact-us → /about#contact,
 * book-auditorium → /about (no auditorium page in specs).
 */
export function legacyRedirect(rawPath: string): RedirectTarget | null {
  const path = rawPath.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const seg = path.split("/").filter(Boolean);
  const head = seg[0]?.toLowerCase();
  const to = (p: string): RedirectTarget => ({ to: p, permanent: true });
  switch (head) {
    case "about-us":
      return seg.length === 1 ? to("/about") : null;
    case "contact-us":
      return seg.length === 1 ? to("/about#contact") : null;
    case "get-involved":
      return seg.length === 1 ? to("/join") : null;
    case "book-auditorium":
      return seg.length === 1 ? to("/about") : null;
    case "saidelhi-backend":
      return to("/admin");
    case "wings": {
      if (seg.length !== 2) return null;
      const wing = LEGACY_WING[seg[1].toLowerCase()];
      return to(wing ? `/programs?wing=${wing}` : "/programs");
    }
    case "content": {
      if (seg.length === 3 && seg[2].toLowerCase() === "getallposts") {
        const c = LEGACY_LIST_CATEGORY[seg[1].charAt(0).toUpperCase()];
        return to(c ? `/news?c=${c}` : "/news");
      }
      if (seg.length === 2) {
        let slug = seg[1];
        try {
          slug = decodeURIComponent(slug);
        } catch {
          return null;
        }
        // Legacy slugs are Django slugify output and are reused verbatim as article slugs.
        return /^[-\w]+$/.test(slug) ? to(`/news/${encodeURIComponent(slug)}`) : null;
      }
      return null;
    }
    default:
      return null;
  }
}
