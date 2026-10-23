import { UiStringPatch, UiStringsQuery } from "@/contract";
import { revalidatePublic, CACHE_TAGS } from "@/server/cache";
import { ok, list } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Shipped messages merged with `ui_string` overrides; `missing=true` = no Hindi yet. */
export const GET = adminRoute({ query: UiStringsQuery, permission: "settings.manage" }, async ({ actor, query }) =>
  list(await services().portal.settings.strings.list(actor, query)),
);

/** Sets/resets one key's text. ICU placeholders must match the English (422 otherwise). */
export const PATCH = adminRoute({ body: UiStringPatch, permission: "settings.manage" }, async ({ actor, body }) => {
  const res = await services().portal.settings.strings.patch(actor, body);
  revalidatePublic([CACHE_TAGS.uiStrings]);
  return ok(res);
});
