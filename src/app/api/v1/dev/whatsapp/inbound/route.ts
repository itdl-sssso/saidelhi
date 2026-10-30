import { SimInboundBody } from "@/contract";
import { assertDevSimulator } from "@/server/http/dev-only";
import { ok } from "@/server/http/envelope";
import { ApiError } from "@/server/http/errors";
import { route } from "@/server/http/route";
import { services } from "@/server/services";

/** Largest photo the simulator accepts after decoding (the bot itself refuses > 10 MB with a clear reply). */
const SIM_MAX_BYTES = 11 * 1024 * 1024;

/** Dev only: acts as a person messaging the bot; returns what the bot answered. `media.data` (base64) carries real bytes. */
export const POST = route({ body: SimInboundBody, guard: async () => assertDevSimulator() }, async ({ body }) => {
  let media = null;
  if (body.media) {
    let bytes: Uint8Array | undefined;
    if (body.media.data) {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(body.media.data)) throw new ApiError("VALIDATION_FAILED", { fields: { "media.data": "Not valid base64." } });
      bytes = new Uint8Array(Buffer.from(body.media.data, "base64"));
      if (bytes.byteLength > SIM_MAX_BYTES) throw new ApiError("VALIDATION_FAILED", { fields: { "media.data": "The file is too large." } });
    }
    media = { kind: body.media.kind, name: body.media.name, mime: body.media.mime, bytes };
  }
  return ok(await services().wa.handle({ from: body.from, text: body.text, replyId: body.replyId, media }));
});
