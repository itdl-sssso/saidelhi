/**
 * Imports the offline Hindi translations of the discourses (M7) into discourse / discourse_block /
 * discourse_glossary. Idempotent upsert by `n`; reviewer-edited or approved blocks are never overwritten.
 * The text is copyrighted: it is read from $DISCOURSES_DIR and never committed.
 *
 *   pnpm db:import-discourses [--dir <path>] [--dry-run]
 *
 * <path> is the folder holding `translations/`, `catalog.json`, `glossary.json`
 * (default ~/Claude/sssso-platform/discourses); pointing at `translations/` itself also works.
 * Prints counts only. A missing folder is a clear message, exit 0.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { closeDb, getDb } from "../src/server/db/client";
import { DiscourseCatalog, parseDiscourse, parseGlossary } from "../src/server/domain/discourse-import";
import { importDiscourses, publishSamples } from "../src/server/services/discourse-import";

const DEFAULT_DIR = path.join(os.homedir(), "Claude", "sssso-platform", "discourses");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const readJson = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));

/** Resolves {translations dir, base dir with catalog.json}; null when nothing usable. */
export function resolveDiscourseDirs(dir: string): { translations: string; base: string } | null {
  const abs = path.resolve(dir.replace(/^~(?=$|\/)/, os.homedir()));
  const sub = path.join(abs, "translations");
  if (existsSync(sub)) return { translations: sub, base: abs };
  if (existsSync(abs) && readdirSync(abs).some((f) => f.endsWith(".hi.json"))) return { translations: abs, base: path.dirname(abs) };
  return null;
}

export async function runImport(opts: { dir?: string; dryRun?: boolean; publish?: number } = {}): Promise<boolean> {
  const dir = opts.dir ?? process.env.DISCOURSES_DIR ?? DEFAULT_DIR;
  const dirs = resolveDiscourseDirs(dir);
  if (!dirs) {
    console.log(`Discourses not imported: no translations found in ${dir}. Set DISCOURSES_DIR or pass --dir.`);
    return false;
  }
  const catalogPath = path.join(dirs.base, "catalog.json");
  const catalog = existsSync(catalogPath) ? DiscourseCatalog.parse(readJson(catalogPath)) : { rows: [], themes: {} };
  if (!existsSync(catalogPath)) console.warn("catalog.json missing: themes and 'why' stay empty.");
  const glossaryPath = path.join(dirs.base, "glossary.json");
  const glossary = existsSync(glossaryPath) ? parseGlossary(readJson(glossaryPath)) : [];

  const files = readdirSync(dirs.translations)
    .filter((f) => /^\d+-.+\.hi\.json$/.test(f))
    .sort();
  const items = files.map((f) => parseDiscourse(readJson(path.join(dirs.translations, f)), f, catalog));
  const db = getDb();
  const stats = await importDiscourses(db, items, glossary, { dryRun: opts.dryRun });
  console.log(`${opts.dryRun ? "[dry-run] " : ""}discourses: ${files.length} files, ${JSON.stringify(stats)}`);
  if (opts.publish && !opts.dryRun) {
    const slugs = await publishSamples(db, opts.publish, new Date());
    console.log(`published ${slugs.length} sample discourse(s) for dev (flag stays as set in Settings).`);
  }
  return true;
}

// Run as CLI (not when imported by the seed script).
if (process.argv[1] && path.basename(process.argv[1]).startsWith("import-discourses")) {
  runImport({ dir: arg("--dir"), dryRun: process.argv.includes("--dry-run"), publish: process.argv.includes("--publish-samples") ? 3 : 0 })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
