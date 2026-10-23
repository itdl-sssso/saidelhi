import { z } from "zod";
import { assertDevSimulator } from "@/server/http/dev-only";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Dev only: both directions for a phone, oldest first. */
export const GET = route({ query: z.object({ phone: z.string().min(8).max(20) }), guard: async () => assertDevSimulator() }, async ({ query }) =>
  ok(await services().wa.dev.messages(query.phone)),
);
