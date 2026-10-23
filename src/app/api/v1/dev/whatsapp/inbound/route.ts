import { SimInboundBody } from "@/contract";
import { assertDevSimulator } from "@/server/http/dev-only";
import { ok } from "@/server/http/envelope";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Dev only: acts as a person messaging the bot; returns what the bot answered. */
export const POST = route({ body: SimInboundBody, guard: async () => assertDevSimulator() }, async ({ body }) =>
  ok(await services().wa.handle({ from: body.from, text: body.text, replyId: body.replyId, media: body.media ? { kind: body.media.kind, name: body.media.name } : null })),
);
