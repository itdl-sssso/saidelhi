import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Legacy URLs like /about-us/ must 301 once (proxy); other trailing slashes are normalised in the proxy.
  skipTrailingSlashRedirect: true,
  // Docker image (deploy/) copies .next/standalone; local `next start` and e2e keep the default output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // LAN testing (`pnpm dev -H 0.0.0.0`): comma-separated hosts, e.g. DEV_ORIGINS=192.168.1.20
  allowedDevOrigins: process.env.DEV_ORIGINS?.split(",").map((h) => h.trim()).filter(Boolean),
  experimental: {
    // The root layout sits under [locale], so unmatched non-locale URLs need a standalone 404.
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        // `as: "*.css"` would turn CSS Modules into global CSS, so they skip the Tailwind loader.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
