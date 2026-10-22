import { AuthOtpRequest } from "@/contract";
import { ok } from "@/server/http/envelope";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(20, 10 * 60 * 1000);

/** 202 for every well-formed number, registered or not; the code goes out only to registered coordinators. */
export const POST = route({ body: AuthOtpRequest }, async ({ body, ip, locale }) => {
  limiter.hit(`auth-otp:${ip ?? "unknown"}`);
  const sent = await services().auth.requestOtp(body.phone, body.channel, locale);
  return ok(sent, { status: 202 });
});
