import { created } from "@/server/http/envelope";
import { UploadToInboxForm, UPLOAD_LIMITS } from "@/contract";
import { readMultipart } from "@/server/http/multipart";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** "Use your own file": the sheet goes to the review inbox instead of being parsed. */
export const POST = adminRoute({ permission: "uploads.manage" }, async ({ actor, req, locale }) => {
  const { file, fields } = await readMultipart(req, UploadToInboxForm, { maxBytes: UPLOAD_LIMITS.sheetBytes, locale });
  return created(await services().portal.uploads.toInbox(actor, file, fields));
});
