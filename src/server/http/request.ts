import { createHash } from "node:crypto";
import { type Locale, LOCALES } from "@/contract";
import { newId } from "../db/columns";

/** `?locale=` wins, then the first en/hi tag in Accept-Language, else 'en'. */
export function resolveLocale(url: URL, headers: Headers): Locale {
  const q = url.searchParams.get("locale");
  if (q && (LOCALES as readonly string[]).includes(q)) return q as Locale;
  const accept = headers.get("accept-language");
  if (accept) {
    const tags = accept
      .split(",")
      .map((part) => {
        const [tag, ...params] = part.trim().split(";");
        const qv = params.find((p) => p.trim().startsWith("q="));
        return { lang: tag.trim().toLowerCase().split("-")[0], q: qv ? Number(qv.trim().slice(2)) : 1 };
      })
      .filter((t) => !Number.isNaN(t.q) && t.q > 0)
      .sort((a, b) => b.q - a.q);
    const hit = tags.find((t) => (LOCALES as readonly string[]).includes(t.lang));
    if (hit) return hit.lang as Locale;
  }
  return "en";
}

/** Reuses a sane incoming x-request-id (from a proxy), else a new ULID. */
export function requestIdFrom(headers: Headers): string {
  const incoming = headers.get("x-request-id");
  return incoming && /^[A-Za-z0-9._-]{8,64}$/.test(incoming) ? incoming : newId();
}

export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return headers.get("x-real-ip");
}

/** Salted hash so raw IPs are never stored. */
export function hashIp(ip: string | null, salt: string): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
