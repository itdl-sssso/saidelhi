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
    params: z.object({ job: z.string().max(40) }),
    guard: async (req) => {
      const secret = env().CRON_SECRET;
      const header = req.headers.get("authorization") ?? "";
      if (!secret || !header.startsWith("Bearer ") || !safeEqual(header.slice(7), secret)) throw new ApiError("UNAUTHENTICATED");
    },
  },
  async ({ params, requestId }) => {
    const job = CronJob.safeParse(params.job);
    if (!job.success) throw new ApiError("NOT_FOUND");
    return ok(await services().portal.jobs.run(job.data, requestId));
  },
);
