import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
