import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isProd = process.env.NODE_ENV === "production";

// No script-src/default-src: nonces would force dynamic rendering and break PPR.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // camera is only used by <input capture> (a file input, not getUserMedia); allow self to be safe.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      // Routes that set their own stricter CSP (/media, admin attachment/inbox/gallery files) are excluded so ours is not merged in.
      { source: "/((?!media/|api/v1/admin/attachments/|api/v1/admin/inbox/|api/v1/admin/gallery/photos/).*)", headers: securityHeaders },
      // Those routes still get the non-CSP headers.
      { source: "/(media|api/v1/admin/attachments|api/v1/admin/inbox|api/v1/admin/gallery/photos)/:path*", headers: securityHeaders.filter((h) => h.key !== "Content-Security-Policy") },
    ];
  },
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
