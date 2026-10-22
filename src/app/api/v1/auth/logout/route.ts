import { noContent } from "@/server/http/envelope";
import { clearPortalCookies, portalTokenOf, requestContext, requireSession } from "@/server/http/portal-session";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Revokes the session and clears the cookies. CSRF-checked like every mutation. */
export const POST = route({}, async ({ req, requestId }) => {
  const rc = requestContext(req, requestId);
  await requireSession(req, undefined, rc);
  const token = portalTokenOf(req);
  if (token) await services().auth.logout(token, rc);
  return clearPortalCookies(noContent());
});
