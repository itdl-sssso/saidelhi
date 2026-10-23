import "server-only";
import type { MetadataRoute } from "next";
import { env } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  const base = env().APP_URL.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Portal, personal form links, dev tools, the API and the hindi twins of the portal.
      disallow: ["/admin", "/hi/admin", "/f/", "/hi/f/", "/api", "/dev", "/hi/dev"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
