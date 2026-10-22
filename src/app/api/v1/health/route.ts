import type { Health } from "@/contract";
import { pingDb } from "@/server/db/client";
import { env } from "@/server/env";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";

export const GET = route({}, async () => {
  const { DATA_SOURCE } = env();
  const db: Health["db"] = DATA_SOURCE === "db" ? ((await pingDb()) ? "ok" : "down") : "skipped";
  const health: Health = {
    status: db === "down" ? "degraded" : "ok",
    dataSource: DATA_SOURCE,
    db,
    time: new Date().toISOString(),
  };
  return ok(health, { status: db === "down" ? 503 : 200 });
});
