import { LinkTokenParams, SubmissionInput } from "@/contract";
import { created } from "@/server/http/envelope";
import { idempotencyKeyOf, requireCsrf } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(30, 10 * 60 * 1000);

/** Idempotent: a retried Idempotency-Key returns the original submission (header `idempotent-replayed: true`). */
export const POST = route({ params: LinkTokenParams, body: SubmissionInput }, async ({ req, params, body, ip, locale }) => {
  limiter.hit(`link-submit:${ip ?? "unknown"}`);
  const sessionToken = requireCsrf(req);
  const key = idempotencyKeyOf(req, true);
  const { submission, replayed } = await services().links.submit(params.token, sessionToken, key, body.answers, locale);
  return created(submission, { headers: replayed ? { "idempotent-replayed": "true" } : {} });
});
