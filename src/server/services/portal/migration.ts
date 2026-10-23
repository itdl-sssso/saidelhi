// Migration (spec 41): review the legacy Django content already loaded into the DB (or an old
// sitemap.xml), map types, preview, import idempotently (article_i18n + native copies + redirect
// rows), and manage redirects. Dump content is never logged: audit rows carry counts only.
import {
  type ArticleCategory,
  type MigrationIssue,
  type MigrationMapPatch,
  type MigrationProblem,
  type MigrationRun,
  type MigrationSource,
  type MigrationTarget,
  type MigrationTypeRow,
  type Paged,
  type RedirectInput,
  type RedirectRow,
  type RedirectsQuery,
  LEGACY_ARTICLE_CATEGORY,
  legacyRedirect,
} from "@/contract";
import { auditRec } from "../../audit";
import { type Actor, assertCan } from "../../auth/rbac";
import { newId } from "../../db/columns";
import { rewriteLegacyMedia } from "../../domain/articles";
import { toIso } from "../../domain/time";
import { ApiError } from "../../http/errors";
import type { ArticleRec, RedirectRec } from "../../repo/types";
import { normaliseRedirectPath } from "../redirects";
import { legacyCategoryOf, type NativeArticle, nativeAll, nativeFromLegacy } from "../native-articles";
import { pageOf, type PortalCtx } from "./shared";

export interface MigrationService {
  create(actor: Actor, source: MigrationSource, file?: { name: string; bytes: Uint8Array }): Promise<MigrationRun>;
  list(actor: Actor): Promise<MigrationRun[]>;
  get(actor: Actor, id: string): Promise<MigrationRun>;
  patch(actor: Actor, id: string, body: MigrationMapPatch): Promise<MigrationRun>;
  runImport(actor: Actor, id: string, body: { version: number }): Promise<MigrationRun>;
  reportCsv(actor: Actor, id: string): Promise<string>;
  redirects: {
    list(actor: Actor, q: RedirectsQuery): Promise<Paged<RedirectRow>>;
    upsert(actor: Actor, body: RedirectInput): Promise<RedirectRow>;
    remove(actor: Actor, from: string): Promise<void>;
  };
}

interface RunData {
  source: MigrationSource;
  fileName: string | null;
  status: MigrationRun["status"];
  startedAt: string;
  finishedAt: string | null;
  by: string;
  /** sourceType -> target; absent = default. */
  mapping: Record<string, MigrationTarget>;
  /** Sitemap runs: de-duplicated paths. */
  urls: string[];
  /** Snapshot taken by the last import (types/counts/issues); null while mapping. */
  snapshot: Snapshot | null;
}

interface Snapshot {
  types: MigrationTypeRow[];
  counts: MigrationRun["counts"];
  issues: MigrationIssue[];
}

interface PostPlan {
  rec: ArticleRec;
  target: MigrationTarget;
  problems: MigrationProblem[];
}

interface Analysis extends Snapshot {
  posts: PostPlan[];
  /** Redirect rows an import would make sure exist. */
  redirectPlan: Omit<RedirectRec, "hits">[];
}

const POST_LABEL: Record<string, string> = {
  N: "News",
  A: "Activities",
  C: "Centenary (national)",
  D: "Centenary (state)",
  K: "Key programmes",
  S: "Special programmes",
  P: "Stories",
};

const PAGE_TYPES: { type: string; label: string; path: string }[] = [
  { type: "page:about-us", label: "About us page", path: "/about-us" },
  { type: "page:contact-us", label: "Contact us page", path: "/contact-us" },
  { type: "page:get-involved", label: "Get involved page", path: "/get-involved" },
  { type: "page:book-auditorium", label: "Book auditorium page", path: "/book-auditorium" },
  { type: "page:wings", label: "Wing pages", path: "/wings/spiritual" },
];

const URL_TYPE = "url";

/** First path segments the new site serves itself: a redirect from these would hide live pages. */
const LIVE_ROOTS = new Set(["", "events", "calendar", "news", "about", "join", "impact", "centres", "centre", "map", "programs", "program", "values", "districts", "district", "privacy", "admin", "f", "api", "hi", "media", "dev", "login"]);

export const isLiveNewRoute = (path: string) => LIVE_ROOTS.has(path.split("/")[1]?.toLowerCase() ?? "");

/** The built-in Django URL rules, shown read-only next to the table rows. */
const RULE_FROMS = [
  "/about-us",
  "/contact-us",
  "/get-involved",
  "/book-auditorium",
  "/saidelhi-backend",
  "/wings/spiritual",
  "/wings/service",
  "/wings/education",
  ...["News", "Activities", "Centenary", "Programmes", "Stories", "Special", "Key"].map((n) => `/content/${n}/getallposts`),
];

const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MEDIA_SRC = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;

const stripTags = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
const hindiOnly = (t: string) => /[ऀ-ॿ]/.test(t) && !/[A-Za-z]/.test(t);

function csvCell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function createMigrationService(ctx: PortalCtx): MigrationService {
  const { repo, deps } = ctx;
  const now = () => deps.now();
  const publicMedia = deps.publicMedia;

  async function fileExists(rel: string): Promise<boolean> {
    return publicMedia.exists ? publicMedia.exists(rel) : (await publicMedia.get(rel)) !== null;
  }

  /** Relative path under MEDIA_ROOT for a legacy upload reference; null for external/non-media URLs. */
  function mediaRel(ref: string): string | null {
    const url = rewriteLegacyMedia(ref.trim(), "/media");
    if (!url) return null;
    if (url.startsWith("/media/")) return decodeURI(url.slice("/media/".length).split(/[?#]/, 1)[0]);
    if (!/^(https?:)?\/\//.test(url) && !url.startsWith("/")) return decodeURI(url.split(/[?#]/, 1)[0]);
    return null;
  }

  async function brokenImages(rec: ArticleRec): Promise<boolean> {
    const refs = new Set<string>();
    if (rec.featuredImage) refs.add(rec.featuredImage);
    for (const g of rec.gallery) refs.add(g.image);
    for (const m of (rec.content ?? "").matchAll(MEDIA_SRC)) refs.add(m[1]);
    for (const r of refs) {
      const rel = mediaRel(r);
      if (rel && !(await fileExists(rel))) return true;
    }
    return false;
  }

  const defaultTarget = (type: string): MigrationTarget => {
    if (type.startsWith("post:")) {
      const letter = type.slice(5);
      return letter in LEGACY_ARTICLE_CATEGORY ? (LEGACY_ARTICLE_CATEGORY[letter as keyof typeof LEGACY_ARTICLE_CATEGORY] as ArticleCategory) : "hidden";
    }
    return "redirect_only";
  };

  const validTarget = (type: string, t: MigrationTarget) => (type.startsWith("post:") ? true : t === "skip" || t === "redirect_only");

  async function analyse(d: RunData): Promise<Analysis> {
    const out: Analysis = { types: [], counts: { items: 0, imported: 0, skipped: 0, needsFix: 0, redirects: 0 }, issues: [], posts: [], redirectPlan: [] };
    const target = (type: string) => d.mapping[type] ?? defaultTarget(type);

    if (d.source === "legacy_db") {
      const [posts, natives, tableRows] = await Promise.all([repo.m6.legacyPosts({ withContent: true }), nativeAll(repo), repo.m6.redirectsAll()]);
      const legacySlugs = new Set(posts.map((p) => p.slug));
      const clash = new Set(natives.filter((n) => n.data.legacyId === null && legacySlugs.has(n.data.slug)).map((n) => n.data.slug));
      const byLetter = new Map<string, number>();
      for (const p of posts) byLetter.set(p.category, (byLetter.get(p.category) ?? 0) + 1);
      const risky = new Set<string>();
      const have = new Map(tableRows.map((r) => [r.fromPath, r]));

      for (const rec of posts) {
        const type = `post:${rec.category}`;
        const to = target(type);
        const problems: MigrationProblem[] = [];
        if (to !== "skip") {
          if (rec.createdAt.getFullYear() < 2005) problems.push("no_date");
          if (await brokenImages(rec)) problems.push("broken_images");
          if (hindiOnly(rec.title)) problems.push("hindi_only");
          const text = stripTags(rec.content ?? "");
          if (PHONE.test(text) || EMAIL.test(text)) problems.push("personal_data");
          if (!text && !(rec.content ?? "").includes("<img")) problems.push("empty_body");
          if (clash.has(rec.slug)) problems.push("slug_clash");
          if (problems.includes("personal_data")) risky.add(type);
        }
        out.posts.push({ rec, target: to, problems });
        out.counts.items++;
        if (to === "skip") out.counts.skipped++;
        else out.counts.imported++;
        for (const problem of problems) out.issues.push({ ref: String(rec.id), title: rec.title, problem, fixPath: `/admin/content/legacy-${rec.id}` });
        if (problems.length) out.counts.needsFix++;
        // Redirects: the Django post URL when its new home differs from the built-in rule's target.
        if (to === "hidden" || to === "redirect_only") {
          if (to === "redirect_only") out.redirectPlan.push({ fromPath: normaliseRedirectPath(`/content/${rec.slug}`), toPath: "/news", permanent: true, source: "migration" });
        }
      }
      // Native copies whose slug differs from the legacy one need an explicit redirect.
      for (const n of natives) {
        if (n.data.legacyId === null) continue;
        const rec = posts.find((p) => p.id === n.data.legacyId);
        if (!rec || rec.slug === n.data.slug) continue;
        out.redirectPlan.push({ fromPath: normaliseRedirectPath(`/content/${rec.slug}`), toPath: `/news/${n.data.slug}`, permanent: true, source: "migration" });
      }
      out.redirectPlan = out.redirectPlan.filter((r) => {
        const cur = have.get(r.fromPath);
        return !cur || cur.source === "migration";
      });

      for (const [letter, items] of [...byLetter].sort((a, b) => b[1] - a[1])) {
        const type = `post:${letter}`;
        out.types.push({
          sourceType: type,
          label: POST_LABEL[letter] ?? (letter === "O" ? "Other (never shown publicly)" : `Category ${letter}`),
          items,
          becomes: target(type),
          risky: letter === "O" || risky.has(type),
        });
      }
      for (const pg of PAGE_TYPES) {
        out.types.push({ sourceType: pg.type, label: pg.label, items: 1, becomes: target(pg.type), risky: false });
        out.counts.items++;
        if (target(pg.type) === "skip") out.counts.skipped++;
        else {
          out.counts.imported++;
          out.counts.redirects++;
        }
      }
    } else {
      const slugs = new Set([...(await repo.m6.legacySlugs()), ...(await nativeAll(repo)).map((n) => n.data.slug)]);
      const to = target(URL_TYPE);
      out.types.push({ sourceType: URL_TYPE, label: "Old site pages", items: d.urls.length, becomes: to, risky: false });
      out.counts.items = d.urls.length;
      const have = new Map((await repo.m6.redirectsAll()).map((r) => [r.fromPath, r]));
      for (const path of d.urls) {
        if (to === "skip") {
          out.counts.skipped++;
          continue;
        }
        if (legacyRedirect(path)) {
          out.counts.imported++;
          out.counts.redirects++;
          continue;
        }
        const slug = path.split("/").filter(Boolean).pop()?.toLowerCase();
        if (slug && slugs.has(slug) && !isLiveNewRoute(path)) {
          out.counts.imported++;
          out.counts.redirects++;
          const cur = have.get(path);
          if (!cur || cur.source === "migration") out.redirectPlan.push({ fromPath: path, toPath: `/news/${slug}`, permanent: true, source: "migration" });
          continue;
        }
        if (path === "/" || isLiveNewRoute(path)) {
          out.counts.skipped++;
          continue;
        }
        // The contract has no "unmatched" problem: slug_clash = no page on the new site answers this address.
        out.issues.push({ ref: path, title: path, problem: "slug_clash", fixPath: null });
        out.counts.needsFix++;
      }
    }
    return out;
  }

  const runDto = (id: string, version: number, d: RunData, a: Snapshot): MigrationRun => ({
    id,
    source: d.source,
    fileName: d.fileName,
    status: d.status,
    startedAt: d.startedAt,
    finishedAt: d.finishedAt,
    by: d.by,
    types: a.types,
    counts: a.counts,
    issues: a.issues.slice(0, 200),
    version,
  });

  async function load(id: string) {
    const doc = await repo.m6.docGet<RunData>("migration_run", id);
    if (!doc) throw new ApiError("NOT_FOUND");
    return doc;
  }

  async function view(doc: { id: string; version: number; data: RunData }): Promise<MigrationRun> {
    const d = doc.data;
    const snap: Snapshot = d.status === "done" && d.snapshot ? d.snapshot : await analyse(d);
    return runDto(doc.id, doc.version, d, snap);
  }

  function parseSitemap(bytes: Uint8Array): string[] {
    const xml = new TextDecoder().decode(bytes);
    if (!/<urlset|<sitemapindex/i.test(xml)) throw new ApiError("VALIDATION_FAILED", { fields: { file: "This does not look like a sitemap.xml." } });
    const paths = new Set<string>();
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      let p: string;
      try {
        const u = new URL(m[1].replace(/&amp;/g, "&"));
        p = normaliseRedirectPath(u.pathname);
      } catch {
        continue;
      }
      if (p.length <= 500) paths.add(p);
      if (paths.size >= 5000) break;
    }
    return [...paths];
  }

  // ---- import -------------------------------------------------------------------

  async function applyPosts(actor: Actor, a: Analysis): Promise<void> {
    const natives = await nativeAll(repo);
    for (const plan of a.posts) {
      const { rec, target } = plan;
      if (target === "skip") continue;
      const cur = rec.i18n;
      const nativeCopy = natives.find((n) => n.data.legacyId === rec.id);
      const fix = plan.problems.some((p) => p === "personal_data" || p === "empty_body" || p === "slug_clash");
      let status = cur?.status ?? "published";
      if (target === "hidden" || target === "redirect_only") status = "hidden";
      else if (fix && status === "published") status = "draft";
      // Editor decisions (hidden/draft) are kept; a published post only moves towards hidden/draft.

      if (nativeCopy) {
        // The native copy is the source of truth: only its category and visibility follow the mapping.
        const want: Partial<NativeArticle> = {};
        if (target !== "hidden" && target !== "redirect_only" && nativeCopy.data.category !== target) want.category = target;
        if (nativeCopy.data.status === "published" && status !== "published") want.status = status;
        if (Object.keys(want).length) {
          const data = { ...nativeCopy.data, ...want };
          await repo.m6.docUpdate("article", { id: nativeCopy.id, k1: data.slug, k2: data.status, data }, nativeCopy.version, [
            auditRec(actor, { action: "migration.article", entity: "article", entityId: nativeCopy.id, data: { legacyId: rec.id, changed: Object.keys(want) } }),
          ]);
        }
        continue;
      }

      const wantsCategory = target !== "hidden" && target !== "redirect_only" && target !== legacyCategoryOf(rec);
      if (wantsCategory) {
        const data = nativeFromLegacy(rec, deps.mediaBase, { category: target as ArticleCategory, status });
        await repo.m6.docInsert("article", { id: newId(), k1: data.slug, k2: data.status, data }, [
          auditRec(actor, { action: "migration.article", entity: "article", entityId: String(rec.id), data: { legacyId: rec.id, category: target } }),
        ]);
        continue;
      }
      if (status !== (cur?.status ?? "published")) {
        await repo.m6.articleI18nUpsert(
          { legacyId: rec.id, titleHi: cur?.titleHi ?? null, summaryHi: cur?.summaryHi ?? null, bodyHi: cur?.bodyHi ?? null, districtId: cur?.districtId ?? null, eventId: cur?.eventId ?? null, status },
          [auditRec(actor, { action: "migration.article", entity: "article", entityId: String(rec.id), data: { legacyId: rec.id, status } })],
        );
      }
    }
  }

  async function applyRedirects(actor: Actor, a: Analysis): Promise<number> {
    const have = new Map((await repo.m6.redirectsAll()).map((r) => [r.fromPath, r]));
    let written = 0;
    for (const r of a.redirectPlan) {
      const cur = have.get(r.fromPath);
      if (cur && (cur.toPath === r.toPath && cur.permanent === r.permanent)) continue;
      if (cur && cur.source !== "migration") continue;
      if (r.fromPath === r.toPath) continue;
      await repo.m6.redirectUpsert(r, [auditRec(actor, { action: "migration.redirect", entity: "redirect", entityId: r.fromPath, data: { to: r.toPath } })]);
      written++;
    }
    return written;
  }

  // ---- redirects ----------------------------------------------------------------

  const toRow = (r: RedirectRec & { updatedAt: Date }): RedirectRow => ({ from: r.fromPath, to: r.toPath, permanent: r.permanent, source: r.source, hits: r.hits, updatedAt: toIso(r.updatedAt) });

  function ruleRows(): RedirectRow[] {
    const out: RedirectRow[] = [];
    for (const from of RULE_FROMS) {
      const t = legacyRedirect(from);
      if (t) out.push({ from, to: t.to, permanent: t.permanent, source: "rule", hits: 0, updatedAt: new Date(0).toISOString() });
    }
    return out;
  }

  const ruleFroms = new Set(RULE_FROMS);

  return {
    async create(actor, source, file) {
      assertCan(actor, "migration.run");
      let urls: string[] = [];
      if (source === "sitemap") {
        if (!file) throw new ApiError("VALIDATION_FAILED", { fields: { file: "Choose the old sitemap.xml." } });
        urls = parseSitemap(file.bytes);
      }
      const data: RunData = { source, fileName: file?.name ?? null, status: "mapping", startedAt: toIso(now()), finishedAt: null, by: actor.name, mapping: {}, urls, snapshot: null };
      const id = newId();
      const res = await repo.m6.docInsert("migration_run", { id, data }, [auditRec(actor, { action: "migration.start", entity: "migration_run", entityId: id, data: { source, urls: urls.length } })]);
      if (!res.ok) throw new ApiError("CONFLICT");
      return view(await load(id));
    },

    async list(actor) {
      assertCan(actor, "migration.run");
      const docs = await repo.m6.docList<RunData>("migration_run", { limit: 20 });
      // The list shows the stored snapshot (or an empty preview); open a run to recompute.
      return docs.map((doc) => {
        const s = doc.data.snapshot ?? { types: [], counts: { items: 0, imported: 0, skipped: 0, needsFix: 0, redirects: 0 }, issues: [] };
        return runDto(doc.id, doc.version, doc.data, s);
      });
    },

    async get(actor, id) {
      assertCan(actor, "migration.run");
      return view(await load(id));
    },

    async patch(actor, id, body) {
      assertCan(actor, "migration.run");
      const doc = await load(id);
      if (doc.data.status !== "mapping") throw new ApiError("CONFLICT");
      if (doc.version !== body.version) throw new ApiError("CONFLICT");
      const known = new Set((await analyse(doc.data)).types.map((t) => t.sourceType));
      const mapping = { ...doc.data.mapping };
      const fields: Record<string, string> = {};
      for (const t of body.types) {
        if (!known.has(t.sourceType)) fields[t.sourceType] = "Unknown type.";
        else if (!validTarget(t.sourceType, t.becomes)) fields[t.sourceType] = "Pages can only be skipped or redirected.";
        else mapping[t.sourceType] = t.becomes;
      }
      if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
      const data: RunData = { ...doc.data, mapping };
      const res = await repo.m6.docUpdate("migration_run", { id, data }, body.version, [auditRec(actor, { action: "migration.map", entity: "migration_run", entityId: id, data: { types: body.types.length } })]);
      if (!res.ok) throw new ApiError("CONFLICT");
      return view(await load(id));
    },

    async runImport(actor, id, body) {
      assertCan(actor, "migration.run");
      const doc = await load(id);
      if (doc.data.status === "importing") throw new ApiError("CONFLICT");
      if (doc.version !== body.version) throw new ApiError("CONFLICT");
      const started: RunData = { ...doc.data, status: "importing" };
      const r1 = await repo.m6.docUpdate("migration_run", { id, data: started }, doc.version);
      if (!r1.ok) throw new ApiError("CONFLICT");
      try {
        const analysis = await analyse(doc.data);
        await applyPosts(actor, analysis);
        const written = await applyRedirects(actor, analysis);
        analysis.counts.redirects += written;
        const snapshot: Snapshot = { types: analysis.types, counts: analysis.counts, issues: analysis.issues };
        const done: RunData = { ...doc.data, status: "done", finishedAt: toIso(now()), snapshot };
        await repo.m6.docUpdate("migration_run", { id, data: done }, r1.version, [
          auditRec(actor, { action: "migration.import", entity: "migration_run", entityId: id, data: { ...snapshot.counts, writtenRedirects: written } }),
        ]);
        deps.revalidate(["articles", "home", "events"]);
      } catch (err) {
        const cur = await repo.m6.docGet<RunData>("migration_run", id);
        if (cur) await repo.m6.docUpdate("migration_run", { id, data: { ...cur.data, status: "failed" } }, cur.version);
        throw err;
      }
      return view(await load(id));
    },

    async reportCsv(actor, id) {
      assertCan(actor, "migration.run");
      const doc = await load(id);
      const snap = doc.data.status === "done" && doc.data.snapshot ? doc.data.snapshot : await analyse(doc.data);
      const lines = ["ref,title,problem,fix_path", ...snap.issues.map((i) => [i.ref, i.title, i.problem, i.fixPath ?? ""].map(csvCell).join(","))];
      return `${lines.join("\r\n")}\r\n`;
    },

    redirects: {
      async list(actor, q) {
        assertCan(actor, "migration.run");
        const rows = [...(await repo.m6.redirectsAll()).map(toRow), ...ruleRows()];
        const seen = new Set<string>();
        const unique = rows.filter((r) => (seen.has(r.from) ? false : (seen.add(r.from), true)));
        const needle = q.q?.toLowerCase();
        const filtered = unique
          .filter((r) => !q.source || r.source === q.source)
          .filter((r) => !needle || r.from.toLowerCase().includes(needle) || r.to.toLowerCase().includes(needle));
        return pageOf(filtered, q.page, q.pageSize);
      },

      async upsert(actor, body) {
        assertCan(actor, "migration.run");
        const from = normaliseRedirectPath(body.from);
        const to = /^https:\/\//.test(body.to) ? body.to : body.to.replace(/\/+$/, "") || "/";
        const fields: Record<string, string> = {};
        if (isLiveNewRoute(from)) fields.from = "This address is a live page on the new site.";
        else if (ruleFroms.has(from)) fields.from = "A built-in rule already handles this address.";
        else if (normaliseRedirectPath(to) === from && !/^https:/.test(to)) fields.to = "Send the address somewhere else.";
        if (Object.keys(fields).length) throw new ApiError("VALIDATION_FAILED", { fields });
        await repo.m6.redirectUpsert({ fromPath: from, toPath: to, permanent: body.permanent ?? true, source: "manual" }, [
          auditRec(actor, { action: "redirect.upsert", entity: "redirect", entityId: from, data: { to, permanent: body.permanent ?? true } }),
        ]);
        const row = (await repo.m6.redirectsAll()).find((r) => r.fromPath === from);
        if (!row) throw new ApiError("NOT_FOUND");
        return toRow(row);
      },

      async remove(actor, from) {
        assertCan(actor, "migration.run");
        const path = normaliseRedirectPath(from);
        const row = (await repo.m6.redirectsAll()).find((r) => r.fromPath === path);
        if (!row && ruleFroms.has(path)) throw new ApiError("VALIDATION_FAILED", { fields: { from: "Built-in rules cannot be deleted." } });
        if (!row) throw new ApiError("NOT_FOUND");
        if (row.source === "rule") throw new ApiError("VALIDATION_FAILED", { fields: { from: "Built-in rules cannot be deleted." } });
        await repo.m6.redirectDelete(path, [auditRec(actor, { action: "redirect.delete", entity: "redirect", entityId: path, data: { to: row.toPath } })]);
      },
    },
  };
}
