import { z } from "zod";
import { CronJob } from "@/contract";
import { env } from "@/server/env";
import { ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { safeEqual } from "@/server/security/crypto";
import { services } from "@/server/services";

/** `Authorization: Bearer $CRON_SECRET`. Jobs are idempotent; safe to re-run. */
export const POST = route(
  {
    params: z.object({ job: CronJob }),
    guard: async (req) => {
      const secret = env().CRON_SECRET;
      const header = req.headers.get("authorization") ?? "";
      if (!secret || !header.startsWith("Bearer ") || !safeEqual(header.slice(7), secret)) throw new ApiError("UNAUTHENTICATED");
    },
  },
  async ({ params, requestId }) => ok(await services().portal.jobs.run(params.job, requestId)),
);
