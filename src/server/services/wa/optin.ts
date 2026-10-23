// Public WhatsApp opt-in (Join / Calendar explainer, contract v0.5 #6): the form
// stores a pending request and sends a confirmation; consent is recorded only
// when the person replies YES (handled by the bot). Always answers neutrally.
import type { OptInBody } from "@/contract";
import { newId } from "../../db/columns";
import { RateLimiter } from "../../http/rate-limit";
import { ApiError } from "../../http/errors";
import { encryptField } from "../../security/crypto";
import { BOT_MIN_AGE_MS, issueBotChallenge, verifyBotChallenge } from "../../security/link-token";
import { maskPhone, normalisePhone, phoneHash } from "../../security/phone";
import { ensureConversation } from "../../whatsapp/conversations";
import { loadOrg } from "../shared";
import type { WaCtx } from "./shared";

const BOT_SCOPE = "optin";

export interface OptInService {
  /** Token for the form to send back as `botToken`. */
  challenge(): { botToken: string; minAgeMs: number };
  request(body: OptInBody, meta: { requestId: string | null; ipHash: string | null }): Promise<void>;
}

export function createOptInService(ctx: WaCtx): OptInService {
  const { repo, deps } = ctx;
  // Three confirmation messages per number per day: nobody can use this to spam a phone.
  const perPhone = new RateLimiter(3, 24 * 60 * 60 * 1000);

  return {
    challenge() {
      return { botToken: issueBotChallenge(deps.secret, BOT_SCOPE, deps.now()), minAgeMs: BOT_MIN_AGE_MS };
    },

    async request(body, meta) {
      if (!verifyBotChallenge(deps.secret, BOT_SCOPE, body.botToken, deps.now())) {
        throw new ApiError("VALIDATION_FAILED", { fields: { botToken: "Please wait a moment and try again." } });
      }
      const e164 = normalisePhone(body.phone);
      if (!e164) throw new ApiError("VALIDATION_FAILED", { fields: { phone: body.locale === "hi" ? "10 अंकों का मोबाइल नंबर लिखें।" : "Enter a 10-digit mobile number." } });
      const hash = phoneHash(deps.secret, e164);
      perPhone.hit(hash);

      const org = await loadOrg(repo);
      const district = body.districtId ? org.get(body.districtId) : undefined;
      const prior = await repo.wa.optInByHash(hash);
      if (prior?.status === "opted_in") return; // neutral: nothing new to confirm
      const at = deps.now();
      await repo.wa.saveOptIn({
        id: prior?.id ?? newId(),
        phoneHash: hash,
        phoneEnc: encryptField(deps.secret, e164),
        phoneMasked: maskPhone(e164),
        districtId: district?.id ?? null,
        sevaTypes: body.sevaTypes,
        locale: body.locale,
        status: "pending",
        via: "web",
        requestedAt: at,
        consentAt: null,
        stoppedAt: null,
        ipHash: meta.ipHash,
      });
      const conv = await ensureConversation(repo.wa, { secret: deps.secret, now: deps.now }, e164);
      if (!conv.locale) {
        conv.locale = body.locale;
        await repo.wa.saveConversation(conv);
      }
      const where = district ? ((body.locale === "hi" ? district.nameHi : null) ?? district.nameEn) : body.locale === "hi" ? "दिल्ली एनसीआर" : "Delhi NCR";
      const summary = body.locale === "hi" ? `आपने ${where} की सेवा के अपडेट माँगे हैं।` : `You asked for seva updates from ${where}.`;
      await deps.whatsapp.sendTemplate(e164, "optin_confirm", body.locale, [summary]);
      await repo.portal.insertAudit({
        actorId: null,
        actorRole: "public",
        action: "whatsapp.optin_requested",
        entity: "whatsapp_optin",
        entityId: null,
        scopeId: district?.id ?? null,
        requestId: meta.requestId,
        ipHash: meta.ipHash,
        data: { sevaTypes: body.sevaTypes },
      });
    },
  };
}
