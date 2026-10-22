import { defineConfig } from "drizzle-kit";

// Introspects the live legacy Django tables into ./.drizzle-pull (gitignored).
// The curated, typed result is kept by hand in src/server/db/legacy.ts.
export default defineConfig({
  dialect: "mysql",
  out: "./.drizzle-pull",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi",
  },
  tablesFilter: ["auth_*", "django_*", "postcontent_*", "districtmembers_*"],
});
