/**
 * Post-import polish of migrated legacy content (M5). Idempotent; prints counts only
 * (the dump holds personal data).
 *
 *   pnpm exec dotenv -e .env.local -- tsx scripts/legacy-polish.ts
 *
 * Also run at the end of `db:import-legacy` and `db:seed` (whichever runs second finds both the
 * posts and the districts it needs).
 *
 *  - Tags `article_i18n.district_id` from `badge_tag` / title (only fills nulls; creates a
 *    published side row when a post has none).
 *  - Inserts `redirect` rows (source `migration`) for the legacy category list URLs.
 *
 * Body HTML cleanup (media URLs, empty paragraphs, inline styles) happens when an article is
 * rendered (`sanitizeBody`), so the legacy tables are never rewritten. Category 'O' posts are
 * hidden by the repositories, not here.
 */
import mysql from "mysql2/promise";
import { detectDistrict } from "../src/server/domain/legacy-content";

/** Django `CATEGORY_SLUGS` -> new `/news` filter. */
export const LEGACY_CATEGORY_REDIRECTS: [path: string, to: string][] = [
  ["/content/Centenary/getallposts", "/news?c=centenary"],
  ["/content/Posts_On_Stories/getallposts", "/news?c=stories"],
  ["/content/Special_Programs/getallposts", "/news?c=special_programs"],
  ["/content/Activities_Of_District/getallposts", "/news?c=activities"],
  ["/content/Key_Programs/getallposts", "/news?c=key_programs"],
  ["/content/News/getallposts", "/news?c=news"],
];

export interface PolishResult {
  tagged: number;
  untagged: number;
  redirects: number;
  skipped: string | null;
}

export async function polishLegacy(conn: mysql.Connection): Promise<PolishResult> {
  const result: PolishResult = { tagged: 0, untagged: 0, redirects: 0, skipped: null };

  const [posts] = await conn.query<mysql.RowDataPacket[]>("SELECT COUNT(*) AS n FROM postcontent_postcontent");
  if (!posts[0]?.n) {
    result.skipped = "no legacy posts";
    return result;
  }

  for (const [from, to] of LEGACY_CATEGORY_REDIRECTS) {
    const [res] = await conn.query<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO `redirect` (from_path, to_path, permanent, source) VALUES (?, ?, 1, 'migration')",
      [from, to],
    );
    result.redirects += res.affectedRows;
  }

  const [districts] = await conn.query<mysql.RowDataPacket[]>("SELECT id, slug FROM org_unit WHERE kind = 'district' AND active = 1");
  if (districts.length === 0) {
    result.skipped = "no districts yet (run db:seed, then this script again)";
    return result;
  }
  const idBySlug = new Map<string, string>(districts.map((d) => [d.slug as string, d.id as string]));

  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT p.id, p.title, p.badge_tag
       FROM postcontent_postcontent p
       LEFT JOIN article_i18n i ON i.legacy_id = p.id
      WHERE i.legacy_id IS NULL OR i.district_id IS NULL`,
  );
  for (const r of rows) {
    const slug = detectDistrict(r.badge_tag as string | null, r.title as string | null);
    const id = slug ? idBySlug.get(slug) : undefined;
    if (!id) {
      result.untagged++;
      continue;
    }
    await conn.query(
      `INSERT INTO article_i18n (legacy_id, district_id, status) VALUES (?, ?, 'published')
       ON DUPLICATE KEY UPDATE district_id = COALESCE(district_id, VALUES(district_id))`,
      [r.id, id],
    );
    result.tagged++;
  }
  return result;
}

export function logPolish(r: PolishResult): void {
  console.log(
    `Legacy polish: ${r.tagged} posts tagged with a district, ${r.untagged} left untagged, ${r.redirects} redirect rows added` +
      (r.skipped ? ` (${r.skipped})` : ""),
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const conn = await mysql.createConnection({ uri: url, timezone: "Z", charset: "utf8mb4" });
  try {
    logPolish(await polishLegacy(conn));
  } finally {
    await conn.end();
  }
}

// Run only when executed directly (import-legacy and seed import `polishLegacy`).
if (process.argv[1] && /legacy-polish\.[cm]?[jt]s$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}
