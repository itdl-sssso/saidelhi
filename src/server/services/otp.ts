// One-time codes over WhatsApp: 6 digits, 5-minute expiry, stored hashed;
// 3 wrong tries lock the phone for 10 minutes; resend throttled to 30 s.
import { randomInt } from "node:crypto";
import type { Locale, OtpSent } from "@/contract";
import { newId } from "../db/columns";
import type { OtpPurpose } from "../db/schema/forms";
import { ApiError } from "../http/errors";
import type { WhatsAppProvider } from "../providers/whatsapp/types";
import type { LinksRepo, OtpRec } from "../repo/links-types";
import { hmacHex, safeEqual } from "../security/crypto";

export const OTP_POLICY = {
  ttlMs: 5 * 60 * 1000,
  resendMs: 30 * 1000,
  maxAttempts: 3,
  lockMs: 10 * 60 * 1000,
  maxPerHour: 6,
} as const;

const T = {
  wrong: (left: number) => ({
    en: `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.`,
    hi: `यह कोड सही नहीं है। ${left} प्रयास बाकी।`,
  }),
  expired: { en: "This code has expired. Ask for a new one.", hi: "यह कोड समाप्त हो गया है। नया कोड मँगाएँ।" },
} as const;

const secs = (ms: number) => Math.max(1, Math.ceil(ms / 1000));

export interface OtpTarget {
  phoneHash: string;
  /** E.164, only to send the message. */
  phone: string;
  purpose: OtpPurpose;
  linkId: string | null;
}

export interface OtpDeps {
  repo: LinksRepo;
  whatsapp: WhatsAppProvider;
  secret: string;
  now: () => Date;
}

const codeHash = (secret: string, id: string, code: string) => hmacHex(secret, "otp", `${id}:${code}`);

function assertNotLocked(c: OtpRec | null, now: Date) {
  if (c?.lockedUntil && c.lockedUntil > now) {
    throw new ApiError("LOCKED", { retryAfter: secs(c.lockedUntil.getTime() - now.getTime()) });
  }
}

/**
 * Creates and sends a code. Throws LOCKED (423), RATE_LIMITED (429) or PROVIDER_UNAVAILABLE (503).
 * `deliver` replaces the WhatsApp send (email channel; or a no-op for unknown portal numbers,
 * which still get a challenge so throttling and locks behave identically).
 */
export async function sendOtp(d: OtpDeps, t: OtpTarget, lang: Locale, deliver?: (code: string) => Promise<unknown>): Promise<OtpSent> {
  const now = d.now();
  const last = await d.repo.latestOtp(t.phoneHash, t.purpose, t.linkId);
  assertNotLocked(last, now);
  if (last && now.getTime() - last.sentAt.getTime() < OTP_POLICY.resendMs) {
    throw new ApiError("RATE_LIMITED", { retryAfter: secs(OTP_POLICY.resendMs - (now.getTime() - last.sentAt.getTime())) });
  }
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  if ((await d.repo.countOtpsSince(t.phoneHash, hourAgo)) >= OTP_POLICY.maxPerHour) {
    throw new ApiError("RATE_LIMITED", { retryAfter: 15 * 60 });
  }

  const id = newId();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const rec: OtpRec = {
    id,
    phoneHash: t.phoneHash,
    purpose: t.purpose,
    linkId: t.linkId,
    codeHash: codeHash(d.secret, id, code),
    attempts: 0,
    lockedUntil: null,
    expiresAt: new Date(now.getTime() + OTP_POLICY.ttlMs),
    sentAt: now,
    consumedAt: null,
  };
  await d.repo.insertOtp(rec);
  try {
    await (deliver ? deliver(code) : d.whatsapp.sendTemplate(t.phone, "login_code", lang, [code]));
  } catch (err) {
    // Do not leave a usable code behind, and let the user retry immediately.
    await d.repo.updateOtp(id, { expiresAt: now, consumedAt: now, sentAt: new Date(0) });
    throw err instanceof ApiError ? err : new ApiError("PROVIDER_UNAVAILABLE", { cause: err });
  }
  return { resendAfter: secs(OTP_POLICY.resendMs), expiresIn: secs(OTP_POLICY.ttlMs) };
}

/** Checks a code. Wrong → 422 (with tries left), third wrong → 423 for 10 minutes. Consumes on success. */
export async function verifyOtp(d: OtpDeps, t: Omit<OtpTarget, "phone">, code: string, locale: Locale): Promise<void> {
  const now = d.now();
  const c = await d.repo.latestOtp(t.phoneHash, t.purpose, t.linkId);
  assertNotLocked(c, now);
  if (!c || c.consumedAt || c.expiresAt <= now) {
    throw new ApiError("VALIDATION_FAILED", { fields: { code: T.expired[locale] } });
  }
  if (safeEqual(c.codeHash, codeHash(d.secret, c.id, code))) {
    await d.repo.updateOtp(c.id, { consumedAt: now });
    return;
  }
  const attempts = c.attempts + 1;
  if (attempts >= OTP_POLICY.maxAttempts) {
    const lockedUntil = new Date(now.getTime() + OTP_POLICY.lockMs);
    await d.repo.updateOtp(c.id, { attempts, lockedUntil, consumedAt: now });
    throw new ApiError("LOCKED", { retryAfter: secs(OTP_POLICY.lockMs) });
  }
  await d.repo.updateOtp(c.id, { attempts });
  throw new ApiError("VALIDATION_FAILED", { fields: { code: T.wrong(OTP_POLICY.maxAttempts - attempts)[locale] } });
}
