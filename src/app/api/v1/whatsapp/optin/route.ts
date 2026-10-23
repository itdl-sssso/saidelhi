import { OptInBody } from "@/contract";
import { env } from "@/server/env";
import { ok } from "@/server/http/envelope";
import { RateLimiter } from "@/server/http/rate-limit";
import { hashIp } from "@/server/http/request";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

// 10 requests per IP per 10 minutes (per-number limits live in the service).
const limiter = new RateLimiter(10, 10 * 60 * 1000);

/** Bot-check token for the Join / Calendar opt-in form (send it back as `botToken`). */
export const GET = route({}, async () => ok(services().wa.optin.challenge()));

/** 202 for every well-formed request. Consent is recorded when the person replies YES on WhatsApp. */
export const POST = route({ body: OptInBody }, async ({ body, ip, requestId }) => {
  limiter.hit(`optin:${ip ?? "unknown"}`);
  await services().wa.optin.request(body, { requestId, ipHash: hashIp(ip, env().SESSION_SECRET ?? "dev-salt") });
  return ok({ accepted: true }, { status: 202 });
});
