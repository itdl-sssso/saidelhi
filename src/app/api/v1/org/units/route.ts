import { OrgUnitsQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: OrgUnitsQuery }, async ({ query }) => ok(await services().districts.units(query)));
