import { ValueParams } from "@/contract";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

export const GET = route({ params: ValueParams }, async ({ params }) => ok(await services().values.bySlug(params.slug)));
