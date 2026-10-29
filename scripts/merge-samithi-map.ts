/**
 * Merges PUBLIC data from the old site's Google My Maps KML into src/server/data/sssso-units.json:
 * pin coordinates and locality text for samithis, plus building pins as district `centres`.
 * Convener / president names and phones in the KML descriptions are NOT read here
 * (see scripts/import-coordinators.ts, output stays in gitignored .local-dumps).
 *
 *   pnpm data:merge-samithi-map [path/to/legacy-samithi-map.kml]
 *
 * Idempotent. Existing ssssoindia coordinates are kept; pins >1 km away are reported.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const UNITS = path.resolve("src/server/data/sssso-units.json");

export interface KmlPin {
  folder: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
}

export function resolveKml(arg?: string): string {
  let root: string | null = null;
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
    root = path.dirname(common);
  } catch {
    /* not in git */
  }
  const cands = [arg, process.env.LEGACY_SAMITHI_KML, ".local-dumps/legacy-samithi-map.kml", root ? path.join(root, ".local-dumps/legacy-samithi-map.kml") : undefined].filter(
    (p): p is string => !!p,
  );
  for (const c of cands) {
    const abs = path.resolve(c);
    if (existsSync(abs)) return abs;
  }
  throw new Error(`KML not found. Tried: ${cands.join(", ")}`);
}

const unCdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();

export function parseKml(xml: string): KmlPin[] {
  const out: KmlPin[] = [];
  const folders = [...xml.matchAll(/<Folder>([\s\S]*?)<\/Folder>/g)];
  const scopes = folders.length ? folders.map((f) => f[1]) : [xml];
  for (const body of scopes) {
    const folder = unCdata(/<name>([\s\S]*?)<\/name>/.exec(body)?.[1] ?? "");
    for (const pm of body.matchAll(/<Placemark>([\s\S]*?)<\/Placemark>/g)) {
      const p = pm[1];
      const name = unCdata(/<name>([\s\S]*?)<\/name>/.exec(p)?.[1] ?? "").replace(/\s+/g, " ");
      const c = /<coordinates>\s*([-\d.]+),([-\d.]+)/.exec(p);
      if (!name || !c) continue;
      out.push({ folder, name, lng: Number(c[1]), lat: Number(c[2]), description: unCdata(/<description>([\s\S]*?)<\/description>/.exec(p)?.[1] ?? "") });
    }
  }
  return out;
}

/** Folder name ("Gautam Budh Nagar District") → district slug in sssso-units. */
export function folderSlug(folder: string): string {
  return folder
    .replace(/\s+District$/i, "")
    .toLowerCase()
    .replace(/budh\b/, "buddh")
    .replace(/\s+/g, "-");
}

/** Samithi slug a numbered pin ("North Delhi 01") stands for, else null. */
export function pinSamithiSlug(pin: Pick<KmlPin, "folder" | "name">): string | null {
  const m = /^(.+?)\s*0*(\d+)\b/.exec(pin.name);
  if (!m) return null;
  const district = folderSlug(pin.folder);
  return folderSlug(m[1].replace(/\bdelhi\b/i, "").trim()) === district ? `${district}-${Number(m[2])}` : null;
}

/** Slug of the building centre a pin stands for (auditorium merges into the International Centre), else null. */
export function pinBuildingSlug(pin: Pick<KmlPin, "name">): string | null {
  return BUILDINGS.find((b) => b.re.test(pin.name))?.slug ?? null;
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Hand-cleaned locality text (the pins hold ALL-CAPS, typo'd text). Keyed by "<district slug>-<n>". */
const LOCALITY: Record<string, string> = {
  "faridabad-1": "Sector 7, 8, 9, 10 & 11",
  "faridabad-2": "NIT",
  "faridabad-3": "Sector 14, 15, 16",
  "faridabad-4": "Sector 37, 91, IP Colony",
  "faridabad-5": "Green Field, Charmwood",
  "gurugram-1": "Laxman Vihar, Sector 4, 5, 7, 10, 37D, New Colony",
  "gurugram-2": "DLF 4, South City 1, Sector 31, 40, 45, 46, 50–57",
  "gurugram-3": "DLF Phase 1–5, Golf Course",
  "gurugram-4": "Palam Vihar, Ashok Vihar, Brijwasan, Kapashera",
  "gurugram-5": "Sohna Road, Rajiv Chowk to Badshahpur",
  "gurugram-6": "Sector 12–17",
  "gurugram-7": "Manesar, Sector 83–89",
};

interface BuildingSpec {
  re: RegExp;
  /** Pins matching `merge` collapse into the first one. */
  slug: string;
  name: string;
  address: string;
  pincode?: string;
}
const BUILDINGS: BuildingSpec[] = [
  {
    re: /international centre/i,
    slug: "sai-international-centre",
    name: "Sri Sathya Sai International Centre",
    address: "Bhisham Pitamah Marg, Pragati Vihar, New Delhi 110003",
    pincode: "110003",
  },
  { re: /auditorium/i, slug: "sai-international-centre", name: "", address: "" }, // same building as the International Centre
  { re: /sec 21 noida/i, slug: "sai-centre-sector-21-noida", name: "Sai Centre, Sector 21", address: "Sector 21, Noida, Uttar Pradesh" },
  { re: /sec - 31 noida/i, slug: "sai-centre-sector-31-noida", name: "Sai Centre, Sector 31", address: "Sector 31, Noida, Uttar Pradesh" },
  { re: /nilayam/i, slug: "sai-nilayam-palam-vihar", name: "Sri Sathya Sai Nilayam, Palam Vihar", address: "Palam Vihar, Gurugram, Haryana" },
  { re: /badshahpur/i, slug: "sai-seva-centre-badshahpur", name: "Sri Sathya Sai Seva Centre, Badshahpur", address: "Badshahpur, Sohna Road, Gurugram, Haryana" },
  { re: /vidya vihar/i, slug: "sai-vidya-vihar-south-east-delhi", name: "Sri Sathya Sai Vidya Vihar", address: "South East Delhi" },
  { re: /prashanti dham/i, slug: "prashanti-dham-sai-mandir-dwarka", name: "Prashanti Dham Sai Mandir, Dwarka", address: "Dwarka, New Delhi" },
  { re: /neher par/i, slug: "bhajan-mandali-neher-par", name: "Bhajan Mandali, Neher Par", address: "Neher Par, Faridabad, Haryana" },
  { re: /centre\s*-\s*faridabad/i, slug: "sai-centre-faridabad", name: "Sathya Sai Centre, Faridabad", address: "Faridabad, Haryana" },
];

interface Samithi {
  slug: string;
  name: string;
  lat?: number;
  lng?: number;
  localName?: string;
  [k: string]: unknown;
}
interface Centre {
  slug: string;
  name: string;
  address: string;
  pincode?: string;
  lat: number;
  lng: number;
  samithi: string;
}
interface District {
  name: string;
  slug: string;
  samithis: Samithi[];
  centres?: Centre[];
  [k: string]: unknown;
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

function main() {
  const pins = parseKml(readFileSync(resolveKml(process.argv[2]), "utf8"));
  const data = JSON.parse(readFileSync(UNITS, "utf8")) as { districts: District[]; [k: string]: unknown };
  const bySlug = new Map(data.districts.map((d) => [d.slug, d]));

  let matched = 0;
  let added = 0;
  let localities = 0;
  const unmatched: string[] = [];
  const conflicts: string[] = [];
  const buildingPins: { pin: KmlPin; district: District; spec: BuildingSpec }[] = [];

  for (const pin of pins) {
    const district = bySlug.get(folderSlug(pin.folder));
    if (!district) {
      unmatched.push(`${pin.name} (no district ${pin.folder})`);
      continue;
    }
    const m = /^(.+?)\s*0*(\d+)\b/.exec(pin.name);
    const prefix = m ? folderSlug(m[1].replace(/\bdelhi\b/i, "").trim()) : "";
    const sam = m && (prefix === district.slug || prefix === district.slug.replace(/-/g, "")) ? district.samithis.find((s) => s.slug === `${district.slug}-${Number(m[2])}`) : undefined;
    if (m && prefix === district.slug) {
      if (!sam) {
        unmatched.push(`${pin.name} (no samithi ${district.slug}-${Number(m[2])})`);
        continue;
      }
      matched++;
      const loc = LOCALITY[sam.slug];
      if (loc) {
        sam.localName = loc;
        localities++;
      }
      if (sam.lat == null || sam.lng == null) {
        sam.lat = r6(pin.lat);
        sam.lng = r6(pin.lng);
        added++;
      } else {
        const km = haversineKm([sam.lat, sam.lng], [pin.lat, pin.lng]);
        if (km > 1) conflicts.push(`${sam.slug} ${km.toFixed(1)} km`);
      }
      continue;
    }
    const spec = BUILDINGS.find((b) => b.re.test(pin.name));
    if (spec) buildingPins.push({ pin, district, spec });
    else unmatched.push(`${pin.name} (unknown pin type)`);
  }

  // Buildings → district centres on the nearest samithi (by merged coordinates).
  for (const d of data.districts) delete d.centres;
  const seen = new Set<string>();
  for (const { pin, district, spec } of buildingPins) {
    if (seen.has(spec.slug)) continue; // auditorium pin merged into International Centre
    seen.add(spec.slug);
    const nearest = district.samithis
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({ s, km: haversineKm([s.lat as number, s.lng as number], [pin.lat, pin.lng]) }))
      .sort((a, b) => a.km - b.km)[0];
    if (!nearest) {
      unmatched.push(`${pin.name} (district has no pinned samithi)`);
      continue;
    }
    (district.centres ??= []).push({
      slug: spec.slug,
      name: spec.name,
      address: spec.address,
      ...(spec.pincode ? { pincode: spec.pincode } : {}),
      lat: r6(pin.lat),
      lng: r6(pin.lng),
      samithi: nearest.s.slug,
    });
  }

  writeFileSync(UNITS, JSON.stringify(data, null, 1) + "\n");
  const all = data.districts.flatMap((d) => d.samithis);
  const noPin = all.filter((s) => s.lat == null).map((s) => s.slug);
  const centres = data.districts.reduce((n, d) => n + (d.centres?.length ?? 0), 0);
  console.log(`pins ${pins.length}: samithi-matched ${matched}, buildings ${buildingPins.length} -> ${centres} centres, unmatched ${unmatched.length}`);
  console.log(`coords added ${added}, locality names ${localities}, conflicts>1km ${conflicts.length}`);
  if (unmatched.length) console.log("unmatched:", unmatched.join("; "));
  if (conflicts.length) console.log("conflicts:", conflicts.join("; "));
  console.log(`samithis without any coords (${noPin.length}):`, noPin.join(", "));
}

if (process.argv[1]?.endsWith("merge-samithi-map.ts")) main();
