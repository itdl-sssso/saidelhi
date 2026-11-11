import { IdParams, VIDEO_LIMITS, VideoCaptionForm } from "@/contract";
import { ok } from "@/server/http/envelope";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Multipart `file` (.srt or .vtt, <= 2 MB) + `lang` (hi|en). SRT is converted to WebVTT; replaces that language. */
export const POST = adminRoute({ params: IdParams, permission: "content.edit" }, async ({ actor, params, req, locale }) => {
  const { file, fields } = await readMultipart(req, VideoCaptionForm, { maxBytes: VIDEO_LIMITS.captionBytes, locale });
  return ok(await services().portal.videos.addCaptions(actor, params.id, fields.lang, file));
});
