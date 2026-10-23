// Pure helpers for the centre locator (spec 12). No React so they are unit-testable.
import type { Geo } from "@/contract";

/** Google Maps directions link (external). Coordinates when known, else the address. */
export function directionsUrl(centre: { address: string; geo: Geo | null }): string {
  const destination = centre.geo ? `${centre.geo.lat},${centre.geo.lng}` : centre.address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** The search box takes a 6-digit pincode or free text (locality, centre name). */
export function parseSearch(raw: string | undefined): { q?: string; pincode?: string } {
  const v = (raw ?? "").trim().slice(0, 80);
  if (!v) return {};
  return /^\d{6}$/.test(v) ? { pincode: v } : { q: v };
}

/** "1.2 km" (one decimal, the server's rounding), or null when no distance is known. */
export function formatKm(km: number | null, locale: "en" | "hi"): string | null {
  if (km === null) return null;
  const n = new Intl.NumberFormat(`${locale}-IN`, { numberingSystem: "latn", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(km);
  return `${n} km`;
}

/** Delhi NCR default view when no centre has coordinates. */
export const NCR_CENTRE = { lat: 28.6139, lng: 77.209, zoom: 10 } as const;
