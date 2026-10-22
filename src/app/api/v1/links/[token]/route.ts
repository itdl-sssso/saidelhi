import { LinkTokenParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { sessionTokenOf } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(120, 60 * 1000);

/** Link state + event card (spec 19/22). Unknown or malformed tokens → generic 404. */
export const GET = route({ params: LinkTokenParams }, async ({ req, params, ip }) => {
  limiter.hit(`link-info:${ip ?? "unknown"}`);
  return ok(await services().links.info(params.token, sessionTokenOf(req)));
});
