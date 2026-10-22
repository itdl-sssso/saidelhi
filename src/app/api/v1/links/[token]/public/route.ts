import { LinkTokenParams, PublicSessionRequest } from "@/contract";
import { toIso } from "@/server/domain/time";
import { ok } from "@/server/http/envelope";
import { withSessionCookies } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(20, 10 * 60 * 1000);

/** Public links (and desk links without OTP): bot check → link session. */
export const POST = route({ params: LinkTokenParams, body: PublicSessionRequest }, async ({ params, body, ip }) => {
  limiter.hit(`link-public:${ip ?? "unknown"}`);
  const grant = await services().links.startPublic(params.token, body);
  // Honeypot filled: look like success, start nothing.
  if (!grant) return ok({ expiresAt: toIso(new Date()), csrf: "" });
  return withSessionCookies(ok(grant.session), grant);
});
