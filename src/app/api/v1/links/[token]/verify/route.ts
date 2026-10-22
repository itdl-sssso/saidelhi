import { LinkTokenParams, VerifyRequest } from "@/contract";
import { ok } from "@/server/http/envelope";
import { withSessionCookies } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(20, 10 * 60 * 1000);

/** Checks the WhatsApp code and starts a link session (`fsid` + `csrf` cookies). */
export const POST = route({ params: LinkTokenParams, body: VerifyRequest }, async ({ params, body, ip, locale }) => {
  limiter.hit(`link-verify:${ip ?? "unknown"}`);
  const grant = await services().links.verify(params.token, body.phone, body.code, locale);
  return withSessionCookies(ok(grant.session), grant);
});
