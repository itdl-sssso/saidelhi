import { ok } from "@/server/http/envelope";
import { adminRoute } from "@/server/http/portal-session";
import { services } from "@/server/services";

export const GET = adminRoute({ permission: "discourses.edit" }, async ({ actor }) => ok(await services().portal.discourses.glossary(actor)));
