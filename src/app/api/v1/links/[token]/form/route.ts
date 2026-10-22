import { LinkTokenParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { sessionTokenOf } from "@/server/http/link-session";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** The link's locked form version, event prefill and any earlier submission. */
export const GET = route({ params: LinkTokenParams }, async ({ req, params, locale }) => {
  return ok(await services().links.form(params.token, sessionTokenOf(req), locale));
});
