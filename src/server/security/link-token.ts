// Form-link tokens, link state, link-session cookies and the public bot check.
import type { LinkState } from "@/contract";
import { hmacB64, randomToken, safeEqual, sha256Hex } from "./crypto";

/**
 * A link token is 128 bits: HMAC(secret, nonce) truncated, base64url (22 chars).
 * The DB keeps only sha256(token) and the random nonce, so a DB leak alone does
 * not reveal tokens, yet authorised viewers can still be given the URL again.
 * Rotating SESSION_SECRET invalidates every link.
 */
export const deriveLinkToken = (secret: string, nonce: string) =>
  Buffer.from(hmacB64(secret, "form-link", nonce), "base64url").subarray(0, 16).toString("base64url");

export const newLinkNonce = () => randomToken(16);

export const hashLinkToken = (token: string) => sha256Hex(token);

/** Tokens we could have issued: 22 base64url chars. Anything else is a 404 without a DB hit. */
export const isWellFormedToken = (token: string) => /^[A-Za-z0-9_-]{22}$/.test(token);

export interface LinkStateInput {
  revokedAt: Date | null;
  expiresAt: Date;
  maxUses: number | null;
  uses: number;
}

/** Precedence: revoked > expired > used up > active. */
export function linkState(l: LinkStateInput, now: Date): LinkState {
  if (l.revokedAt) return "revoked";
  if (l.expiresAt.getTime() <= now.getTime()) return "expired";
  if (l.maxUses !== null && l.uses >= l.maxUses) return "used_up";
  return "active";
}

/** Link-session cookie value: random; the DB stores sha256 of it as the session id. */
export const newSessionToken = () => randomToken(32);
export const sessionIdFor = (token: string) => sha256Hex(`fsid:${token}`);

/** CSRF token bound to the session, so a planted `csrf` cookie is useless. */
export const csrfFor = (secret: string, sessionToken: string) => hmacB64(secret, "csrf", sessionToken);

export function csrfValid(secret: string, sessionToken: string, header: string | null, cookie: string | null): boolean {
  if (!header || !cookie || !safeEqual(header, cookie)) return false;
  return safeEqual(header, csrfFor(secret, sessionToken));
}

/**
 * Bot check for public links: GET /links/:token issues `issuedAt.nonce.sig`,
 * POST /public must return it between MIN_AGE and MAX_AGE later (plus an empty
 * honeypot). To move to Cloudflare Turnstile, return the site key from GET and
 * replace `verifyBotChallenge` with a call to Turnstile's siteverify endpoint.
 */
export const BOT_MIN_AGE_MS = 1500;
export const BOT_MAX_AGE_MS = 30 * 60 * 1000;

export function issueBotChallenge(secret: string, linkId: string, now: Date): string {
  const issued = String(now.getTime());
  const nonce = randomToken(8);
  return `${issued}.${nonce}.${hmacB64(secret, "bot", `${linkId}.${issued}.${nonce}`)}`;
}

export function verifyBotChallenge(secret: string, linkId: string, challenge: string, now: Date): boolean {
  const [issued, nonce, sig, extra] = challenge.split(".");
  if (!issued || !nonce || !sig || extra !== undefined || !/^\d{10,16}$/.test(issued)) return false;
  if (!safeEqual(sig, hmacB64(secret, "bot", `${linkId}.${issued}.${nonce}`))) return false;
  const age = now.getTime() - Number(issued);
  return age >= BOT_MIN_AGE_MS && age <= BOT_MAX_AGE_MS;
}
