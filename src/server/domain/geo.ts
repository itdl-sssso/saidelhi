import pins from "../data/ncr-pincodes.json";

export interface LatLng {
  lat: number;
  lng: number;
}

const TABLE = pins.pins as unknown as Record<string, [number, number]>;

/** Approximate centroid of an NCR pincode, or null when unknown. */
export function pincodeCentroid(pincode: string | null | undefined): LatLng | null {
  if (!pincode) return null;
  const p = TABLE[pincode];
  return p ? { lat: p[0], lng: p[1] } : null;
}

/** Great-circle distance in km (haversine), rounded to 1 decimal. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  return Math.round(km * 10) / 10;
}
