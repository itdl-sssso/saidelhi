import { ArticlesQuery } from "@/contract";
import { list } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ query: ArticlesQuery }, async ({ query }) => list(await services().articles.list(query)));
