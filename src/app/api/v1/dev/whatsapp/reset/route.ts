import { z } from "zod";
import { assertDevSimulator } from "@/server/http/dev-only";
import { noContent } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Dev only: forgets the conversation (language, flow state) and its messages for a phone. */
export const POST = route({ body: z.object({ phone: z.string().min(8).max(20) }), guard: async () => assertDevSimulator() }, async ({ body }) => {
  await services().wa.dev.reset(body.phone);
  return noContent();
});
