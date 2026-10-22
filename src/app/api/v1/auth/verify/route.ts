import { AuthVerifyRequest } from "@/contract";
import { ok } from "@/server/http/envelope";
import { requestContext, withPortalCookies } from "@/server/http/portal-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(20, 10 * 60 * 1000);

/** Checks the code, starts a 7-day sliding session (`sid` + `csrf` cookies) and returns Me. */
export const POST = route({ body: AuthVerifyRequest }, async ({ req, body, ip, locale, requestId }) => {
  limiter.hit(`auth-verify:${ip ?? "unknown"}`);
  const rc = requestContext(req, requestId);
  const { me, grant } = await services().auth.verify(body.phone, body.code, { ...rc, userAgent: req.headers.get("user-agent") }, locale);
  return withPortalCookies(ok(me), grant);
});
