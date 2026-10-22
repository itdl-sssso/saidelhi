import { LinkTokenParams, OtpRequest } from "@/contract";
import { ok } from "@/server/http/envelope";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(10, 10 * 60 * 1000);

/** 202 whether or not a code went out (except PHONE_NOT_LISTED on report links). */
export const POST = route({ params: LinkTokenParams, body: OtpRequest }, async ({ params, body, ip, locale }) => {
  limiter.hit(`link-otp:${ip ?? "unknown"}`);
  return ok(await services().links.sendOtp(params.token, body.phone, locale), { status: 202 });
});
