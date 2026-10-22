import { PrivacyRequestInput } from "@/contract";
import { env } from "@/server/env";
import { created } from "@/server/http/envelope";
import { newId } from "@/server/db/columns";
import { RateLimiter } from "@/server/http/rate-limit";
import { hashIp } from "@/server/http/request";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

// 5 requests per IP per 10 minutes.
const limiter = new RateLimiter(5, 10 * 60 * 1000);

export const POST = route({ body: PrivacyRequestInput }, async ({ body, ip, requestId }) => {
  limiter.hit(ip ?? "unknown");
  // Honeypot filled: answer like a success so bots learn nothing, store nothing.
  if (body.website) return created({ id: newId() });
  const ipHash = hashIp(ip, env().SESSION_SECRET ?? "dev-salt");
  const result = await services().privacy.createRequest(body, { requestId, ipHash });
  return created(result);
});
