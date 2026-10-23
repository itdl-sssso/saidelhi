import { UPLOAD_LIMITS } from "@/contract";
import { z } from "zod";
import { ok } from "@/server/http/envelope";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Multipart `file`: CSV `date,text_en,text_hi,source_en,source_hi`. Existing days are updated. */
export const POST = adminRoute({ permission: "content.edit" }, async ({ actor, req, locale }) => {
  const { file } = await readMultipart(req, z.object({}), { maxBytes: UPLOAD_LIMITS.sheetBytes, locale });
  return ok(await services().portal.content.importThoughts(actor, file));
});
