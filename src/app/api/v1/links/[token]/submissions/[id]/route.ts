import { LinkSubmissionParams, SubmissionPatch } from "@/contract";
import { ok } from "@/server/http/envelope";
import { requireCsrf } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(30, 10 * 60 * 1000);

/** Edit until approved; stale `version` → 409. */
export const PATCH = route({ params: LinkSubmissionParams, body: SubmissionPatch }, async ({ req, params, body, ip, locale }) => {
  limiter.hit(`link-patch:${ip ?? "unknown"}`);
  const sessionToken = requireCsrf(req);
  return ok(await services().links.update(params.token, sessionToken, params.id, body, locale));
});
