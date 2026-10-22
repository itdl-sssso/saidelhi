import { CentresQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: CentresQuery }, async ({ query }) => list(await services().centres.list(query)));
