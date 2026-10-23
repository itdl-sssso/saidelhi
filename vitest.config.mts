import path from "node:path";
import { defineConfig } from "vitest/config";

const common = {
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the react-server condition; tests run plain Node.
      "server-only": path.resolve(import.meta.dirname, "tests/support/server-only.ts"),
    },
  },
};

export default defineConfig({
  test: {
    projects: [
      // Pure/in-memory tests run in parallel.
      {
        ...common,
        test: { name: "unit", environment: "node", include: ["tests/**/*.test.ts"], exclude: ["tests/**/*.db.integration.test.ts"], testTimeout: 20_000 },
      },
      // Tests sharing the one dev MySQL run one file at a time (they mutate the same rows).
      {
        ...common,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/**/*.db.integration.test.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          globalSetup: ["tests/support/db-global-setup.ts"],
        },
      },
    ],
  },
});
