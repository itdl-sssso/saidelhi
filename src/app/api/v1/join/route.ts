import { JoinQuery } from "@/contract";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: JoinQuery }, async ({ query }) => ok(await services().join.get(query)));
