import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Matches .env.example so dev link tokens are the same on every machine. Never used in production. */
export const DEV_SESSION_SECRET = "dev-session-secret-change-me-0000000000000000";

export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

/** Keyed hash with a purpose label, so one root secret yields independent keys. */
export const hmacHex = (secret: string, label: string, value: string) =>
  createHmac("sha256", secret).update(`${label}\u0000${value}`).digest("hex");

export const hmacB64 = (secret: string, label: string, value: string) =>
  createHmac("sha256", secret).update(`${label}\u0000${value}`).digest("base64url");

export const randomToken = (bytes = 16) => randomBytes(bytes).toString("base64url");

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const encKey = (secret: string) => createHmac("sha256", secret).update("aes-256-gcm\u0000field-encryption").digest();

/** AES-256-GCM, output `iv.tag.ciphertext` (base64url). For small fields such as phone numbers. */
export function encryptField(secret: string, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(secret), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decryptField(secret: string, sealed: string): string | null {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !body) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", encKey(secret), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(body), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
