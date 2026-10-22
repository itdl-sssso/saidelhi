import { hmacHex } from "./crypto";

/**
 * Normalises to E.164. Bare 10-digit numbers (optionally with a leading 0 or 91)
 * are Indian mobiles. Returns null when it cannot be a phone number.
 */
export function normalisePhone(input: string): string | null {
  const s = input.replace(/[\s().-]/g, "");
  const india = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(s);
  if (india) return `+91${india[1]}`;
  if (/^\+[1-9]\d{7,14}$/.test(s)) return s;
  if (/^00[1-9]\d{7,14}$/.test(s)) return `+${s.slice(2)}`;
  return null;
}

/** '+91 98•••••52' (§4.1): country code, first two and last two digits; fixed-width middle hides the length. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  const ccLen = digits.startsWith("91") || digits.length > 11 ? 2 : 1;
  const cc = digits.slice(0, ccLen);
  const rest = digits.slice(ccLen);
  if (rest.length < 6) return `+${cc} •••••`;
  return `+${cc} ${rest.slice(0, 2)}•••••${rest.slice(-2)}`;
}

/** Keyed lookup hash; raw phones are never used as keys. */
export const phoneHash = (secret: string, e164: string) => hmacHex(secret, "phone", e164);
