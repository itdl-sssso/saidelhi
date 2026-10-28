import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

/** Thoughts without a date: the rotation pool (one per day by IST date, unless a day has its own or an official one). */
export const GET = adminRoute({ permission: "content.edit" }, async ({ actor }) => ok(await services().portal.content.thoughtPool(actor)));
