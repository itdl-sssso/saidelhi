import { defineConfig } from "drizzle-kit";

// Only our own tables live in ./src/server/db/schema. Legacy Django tables
// (src/server/db/legacy.ts) are deliberately excluded so migrations never
// create, alter or drop them.
export default defineConfig({
  dialect: "mysql",
  schema: "./src/server/db/schema/*",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://app:app@127.0.0.1:3307/saidelhi",
  },
  tablesFilter: ["!auth_*", "!django_*", "!postcontent_*", "!districtmembers_*"],
  strict: true,
  verbose: true,
});
