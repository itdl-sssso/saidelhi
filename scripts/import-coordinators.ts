/**
 * Imports legacy office bearers as portal people (status "invited", nothing is sent).
 *
 *   pnpm db:import-coordinators
 *
 * Sources: legacy table districtmembers_teammembers (state + district office bearers) and the
 * old Google My Maps KML descriptions (samithi conveners, district presidents).
 * Writes the normalised list to .local-dumps/coordinators.json (gitignored, PERSONAL DATA) and
 * upserts app_user + role_assignment, matching by phone (idempotent). Also sets each real
 * centre's contactPhone from its samithi convener (or the pin's own contact for buildings).
 *
 * LOCAL DATABASE ONLY. Prints counts, never names or numbers.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import { closeDb, getDb } from "../src/server/db/client";
import { newId } from "../src/server/db/columns";
import { appUser, centre, orgUnit, roleAssignment } from "../src/server/db/tables";
import { appSecret } from "../src/server/env";
import { encryptField } from "../src/server/security/crypto";
import { maskPhone, normalisePhone, phoneHash } from "../src/server/security/phone";
import { folderSlug, type KmlPin, parseKml, pinBuildingSlug, pinSamithiSlug, resolveKml } from "./merge-samithi-map";

type Role = "state_admin" | "district_coord" | "samithi_coord";
const RANK: Record<Role, number> = { state_admin: 3, district_coord: 2, samithi_coord: 1 };

interface Person {
  name: string;
  phone: string | null;
  email: string | null;
  title: string;
  role: Role | null;
  /** Org-unit slugs (state: "delhi-ncr"); first is the role scope. */
  orgUnits: string[];
  source: "db" | "kml";
}

const HONORIFIC = /^(?:mr|mrs|ms|miss|dr|shri|sri|smt|sh)\b\.?\s*/i;
const cleanName = (s: string) => {
  let out = s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 2; i++) out = out.replace(HONORIFIC, "");
  return out.trim();
};

function assertLocal() {
  const u = new URL(process.env.DATABASE_URL ?? "mysql://x@invalid/");
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname)) {
    throw new Error("Refusing: DATABASE_URL is not a local database.");
  }
}

function roleForTitle(title: string): { role: Role | null; unit: string } {
  const t = title.trim();
  if (/^district president\b/i.test(t)) {
    const d = /\(([^)]+)\)/.exec(t)?.[1] ?? "";
    return { role: "district_coord", unit: folderSlug(d) };
  }
  if (/^state president$/i.test(t) || /^state it incharge\b/i.test(t) || /^state office$/i.test(t)) return { role: "state_admin", unit: "delhi-ncr" };
  return { role: null, unit: "delhi-ncr" };
}

/** Drops everything between `<` and `>` (inclusive), char by char, so no partial tag survives. */
function textOnly(s: string): string {
  let out = "";
  let inTag = false;
  for (const ch of s) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  return out;
}

/** KML description → contacts as [{name, label, phone}]; entries are "<name> (<label>)<br>Mob-<digits>". */
function contacts(desc: string): { name: string; label: string; phone: string | null }[] {
  const lines = desc
    .split(/<br\s*\/?>|\n/i)
    .map((l) => textOnly(l).replace(/&nbsp;/g, " ").trim())
    .filter(Boolean);
  const out: { name: string; label: string; phone: string | null }[] = [];
  let cur: { name: string; label: string; phone: string | null } | null = null;
  for (const line of lines) {
    const mob = /^(?:mob(?:ile)?|m|ph(?:one)?)\s*[-:.]\s*(.*)$/i.exec(line);
    if (mob && cur) {
      cur.phone = normalisePhone(mob[1].replace(/[^\d+]/g, "")) ?? cur.phone;
      continue;
    }
    const lab = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(line);
    cur = { name: cleanName(lab ? lab[1] : line), label: lab ? lab[2] : "", phone: null };
    out.push(cur);
  }
  return out.filter((c) => c.name);
}

async function legacyRows(): Promise<{ name: string; title: string; email: string; phone: string }[]> {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>("SELECT name, title, email, phone FROM districtmembers_teammembers ORDER BY id");
    return rows as never;
  } finally {
    await conn.end();
  }
}

async function main() {
  assertLocal();
  const secret = appSecret();
  const db = getDb();

  const units = await db.select().from(orgUnit);
  const unitBySlug = new Map(units.map((u) => [u.slug, u]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  if (!unitBySlug.has("delhi-ncr")) throw new Error("org units missing: run pnpm db:seed first");

  // 1. People.
  const people: Person[] = [];
  for (const r of await legacyRows()) {
    const { role, unit } = roleForTitle(r.title);
    people.push({
      name: cleanName(r.name),
      phone: normalisePhone(r.phone),
      email: r.email.trim().toLowerCase() || null,
      title: r.title.trim(),
      role: role && unitBySlug.has(unit) ? role : null,
      orgUnits: role && unitBySlug.has(unit) ? [unit] : [],
      source: "db",
    });
  }

  // 2. KML: conveners per samithi; district presidents; building contacts.
  const pins: KmlPin[] = parseKml(readFileSync(resolveKml(), "utf8"));
  const centrePhone = new Map<string, string>(); // centre slug → public phone
  const conveners = new Map<string, string>(); // samithi slug → phone
  const buildingSlugs = new Set<string>();
  let kmlBuildingContacts = 0;
  for (const pin of pins) {
    const cs = contacts(pin.description);
    const samithi = pinSamithiSlug(pin);
    const building = pinBuildingSlug(pin);
    if (building) buildingSlugs.add(building);
    const district = folderSlug(pin.folder);
    for (const c of cs) {
      if (/district\s*president/i.test(c.label)) {
        people.push({ name: c.name, phone: c.phone, email: null, title: `District President (${district})`, role: unitBySlug.has(district) ? "district_coord" : null, orgUnits: unitBySlug.has(district) ? [district] : [], source: "kml" });
      }
    }
    const first = cs.find((c) => !/district\s*president/i.test(c.label));
    if (!first) continue;
    if (samithi && unitBySlug.has(samithi)) {
      people.push({ name: first.name, phone: first.phone, email: null, title: "Samithi Convener", role: "samithi_coord", orgUnits: [samithi], source: "kml" });
      if (first.phone) {
        conveners.set(samithi, first.phone);
        centrePhone.set(samithi, first.phone);
      }
    } else if (building) {
      people.push({ name: first.name, phone: first.phone, email: null, title: "Centre contact", role: null, orgUnits: [], source: "kml" });
      if (first.phone && !centrePhone.has(building)) {
        centrePhone.set(building, first.phone);
        kmlBuildingContacts++;
      }
    }
  }

  // 3. Merge by phone: highest role wins, other units kept on the record.
  const merged = new Map<string, Person>();
  const noPhone: Person[] = [];
  for (const p of people) {
    if (!p.phone) {
      noPhone.push(p);
      continue;
    }
    const cur = merged.get(p.phone);
    if (!cur) {
      merged.set(p.phone, { ...p });
      continue;
    }
    cur.email ||= p.email;
    if (p.role && (!cur.role || RANK[p.role] > RANK[cur.role])) {
      cur.role = p.role;
      cur.orgUnits = [...p.orgUnits, ...cur.orgUnits.filter((u) => !p.orgUnits.includes(u))];
      cur.title = p.title;
    } else {
      cur.orgUnits.push(...p.orgUnits.filter((u) => !cur.orgUnits.includes(u)));
      if (p.source === "db" && cur.source === "kml") cur.title = p.title;
    }
  }
  const final = [...merged.values()];

  const outDir = path.resolve(".local-dumps");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "coordinators.json"),
    JSON.stringify(
      { generatedAt: new Date().toISOString(), people: final.map((p) => ({ ...p, source: undefined })), withoutPhone: noPhone.map((p) => ({ ...p, source: undefined })) },
      null,
      1,
    ),
  );

  // 4. Upsert.
  const stats = { created: 0, updated: 0, unchanged: 0, roleSet: 0 };
  const byRole: Record<string, number> = { state_admin: 0, district_coord: 0, samithi_coord: 0, none: 0 };
  const now = new Date();
  for (const p of final) {
    byRole[p.role ?? "none"]++;
    if (!p.role) continue;
    const scope = unitBySlug.get(p.orgUnits[0]);
    if (!scope) continue;
    const e164 = p.phone as string;
    const hash = phoneHash(secret, e164);
    const [existing] = await db.select().from(appUser).where(eq(appUser.phoneHash, hash)).limit(1);
    let userId: string;
    if (existing) {
      userId = existing.id;
      const patch: Partial<typeof appUser.$inferInsert> = {};
      if (existing.name !== p.name.slice(0, 120)) patch.name = p.name.slice(0, 120);
      if (p.email && existing.email !== p.email.slice(0, 254)) patch.email = p.email.slice(0, 254);
      if (Object.keys(patch).length) {
        await db.update(appUser).set({ ...patch, version: existing.version + 1 }).where(eq(appUser.id, userId));
        stats.updated++;
      } else stats.unchanged++;
    } else {
      userId = newId();
      await db.insert(appUser).values({
        id: userId,
        name: p.name.slice(0, 120),
        phoneEnc: encryptField(secret, e164),
        phoneHash: hash,
        phoneMasked: maskPhone(e164),
        email: p.email?.slice(0, 254) ?? null,
        locale: "en",
        status: "invited",
        invitedBy: null,
        version: 1,
      });
      stats.created++;
    }
    const [cur] = await db.select().from(roleAssignment).where(and(eq(roleAssignment.userId, userId), isNull(roleAssignment.endedAt))).limit(1);
    if (!cur || cur.role !== p.role || cur.scopeId !== scope.id) {
      if (cur) await db.update(roleAssignment).set({ endedAt: now }).where(eq(roleAssignment.id, cur.id));
      await db.insert(roleAssignment).values({ id: newId(), userId, role: p.role, scopeId: scope.id, createdBy: null, endedAt: null });
      stats.roleSet++;
    }
  }

  // 5. Centre contact phones (local DB only; real centres are slugged like their samithi or building).
  const centres = await db.select().from(centre);
  let phonesSet = 0;
  for (const c of centres) {
    const own = centrePhone.get(c.slug);
    const sam = unitById.get(c.samithiId);
    const isBuilding = buildingSlugs.has(c.slug);
    const fallback = isBuilding && sam ? conveners.get(sam.slug) : undefined;
    const phone = own ?? fallback;
    if (!phone || c.contactPhone === pretty(phone)) continue;
    await db.update(centre).set({ contactPhone: pretty(phone), version: c.version + 1 }).where(eq(centre.id, c.id));
    phonesSet++;
  }

  console.log(`people: ${final.length} with phone (+${noPhone.length} without), from ${people.length} rows`);
  console.log(`roles: state_admin ${byRole.state_admin}, district_coord ${byRole.district_coord}, samithi_coord ${byRole.samithi_coord}, no role (skipped) ${byRole.none}`);
  console.log(`users: created ${stats.created}, updated ${stats.updated}, unchanged ${stats.unchanged}; role rows set ${stats.roleSet}`);
  console.log(`centre phones set ${phonesSet} (convener samithis ${conveners.size}, building contacts ${kmlBuildingContacts})`);
  console.log("wrote .local-dumps/coordinators.json");
  await closeDb();
}

const pretty = (e164: string) => `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
  await closeDb();
});
