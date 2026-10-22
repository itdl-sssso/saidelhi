import { ATTACHMENT_LIMITS, LinkTokenParams } from "@/contract";
import { created } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { idempotencyKeyOf, requireCsrf } from "@/server/http/link-session";
import { RateLimiter } from "@/server/http/rate-limit";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

const limiter = new RateLimiter(30, 10 * 60 * 1000);

/** multipart/form-data: `file` + `fieldId`. Stored privately; never served publicly. */
export const POST = route({ params: LinkTokenParams }, async ({ req, params, ip, locale }) => {
  limiter.hit(`link-attach:${ip ?? "unknown"}`);
  const sessionToken = requireCsrf(req);
  const key = idempotencyKeyOf(req, false);
  if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    throw new ApiError("BAD_REQUEST", { message: "Expected multipart/form-data" });
  }
  if (Number(req.headers.get("content-length") ?? "0") > ATTACHMENT_LIMITS.maxBytes + 64 * 1024) {
    throw new ApiError("VALIDATION_FAILED", { fields: { file: "Larger than 10 MB" } });
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError("BAD_REQUEST");
  }
  const file = form.get("file");
  const fieldId = form.get("fieldId");
  if (!(file instanceof File) || typeof fieldId !== "string") {
    throw new ApiError("VALIDATION_FAILED", { fields: { file: "Required", fieldId: "Required" } });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return created(await services().links.attach(params.token, sessionToken, { name: file.name, bytes }, fieldId, key, locale));
});
