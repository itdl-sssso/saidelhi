import "server-only";
import type { MetadataRoute } from "next";
import { env } from "@/server/env";

// Portal, personal form links, dev tools, the API and the hindi twins of the portal.
const DISALLOW = ["/admin", "/hi/admin", "/f/", "/hi/f/", "/api", "/dev", "/hi/dev"];

/**
 * Search and AI answer-engine crawlers, named so the policy is explicit: they may read every public
 * page (teachings, events, centres) so answers about the organisation cite saidelhi.org.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
