/**
 * Loads the legacy saidelhi.org content dump (data-only mysqldump of the Django
 * content tables) into the database, replacing those tables' rows.
 *
 *   pnpm db:import-legacy [path/to/saidelhi-content.sql]
 *
 * Path resolution: CLI arg → $LEGACY_DUMP → ./.local-dumps/… → the main
 * checkout's .local-dumps/… (so it also works from a git worktree).
 * Prints row counts only — the dump contains personal data (team members).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const FILE = "saidelhi-content.sql";
const ALLOWED = new Set([
  "postcontent_postcontent",
  "postcontent_contentpostimage",
  "postcontent_sliderimages",
  "districtmembers_teammembers",
  "django_content_type",
  "django_migrations",
]);

function mainCheckoutRoot(): string | null {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
    return path.dirname(common);
  } catch {
    return null;
  }
}

function resolveDump(): string {
  const root = mainCheckoutRoot();
  const candidates = [
    process.argv[2],
    process.env.LEGACY_DUMP,
    path.join(".local-dumps", FILE),
    root ? path.join(root, ".local-dumps", FILE) : undefined,
  ].filter((p): p is string => !!p);
  for (const c of candidates) {
    const abs = path.isAbsolute(c) ? c : path.resolve(process.cwd(), c);
    if (existsSync(abs)) return abs;
    // LEGACY_DUMP relative to the main checkout as well.
    if (root && !path.isAbsolute(c) && existsSync(path.join(root, c))) return path.join(root, c);
  }
  throw new Error(`Legacy dump not found. Tried: ${candidates.join(", ")}. Set LEGACY_DUMP or pass a path.`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const file = resolveDump();
  const dump = readFileSync(file, "utf8");

  if (/^\s*(DROP|CREATE|ALTER|TRUNCATE)\s/im.test(dump)) {
    throw new Error("Dump contains DDL; expected a data-only dump (mysqldump --no-create-info).");
  }
  const tables = new Set([...dump.matchAll(/INSERT INTO `(\w+)`/g)].map((m) => m[1]));
  const unexpected = [...tables].filter((t) => !ALLOWED.has(t));
  if (unexpected.length) throw new Error(`Dump touches unexpected tables: ${unexpected.join(", ")}`);

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true, timezone: "Z", charset: "utf8mb4" });
  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    // Children first; the dump re-inserts everything.
    const order = ["postcontent_contentpostimage", "postcontent_postcontent", "postcontent_sliderimages", "districtmembers_teammembers", "django_content_type", "django_migrations"];
    for (const t of order) if (tables.has(t)) await conn.query(`DELETE FROM \`${t}\``);
    await conn.query(dump);
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log(`Imported ${path.basename(file)}:`);
    for (const t of order) {
      if (!tables.has(t)) continue;
      const [rows] = await conn.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS n FROM \`${t}\``);
      console.log(`  ${t.padEnd(30)} ${rows[0].n}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
