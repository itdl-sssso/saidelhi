import { isBuiltinCategory, type I18nText, type Article, ArticleCategoryFilter, ArticleDetail, ArticleRef, ArticlesQuery, Paged, UnitRef } from "@/contract";
import { legacyLettersFor, toArticle, toArticleRef, type ArticleContext } from "../domain/articles";
import { contentTypeLabels, GOLDEN_STORIES_SLUG } from "./content-types";
import type { ArticleRec, DataRepo } from "../repo/types";
import { assembleEvents } from "./event-assembler";
import { isLive, nativeAll, nativeAsRec, nativeLive, nativeToArticle, shownAt, type NativeDoc } from "./native-articles";
import type { OrgIndex } from "./org-index";
import { loadOrg, pageOffset } from "./shared";
import type { ArticlesService, ServiceDeps } from "./types";

export function articleContext(org: OrgIndex, mediaBase: string, categoryLabels?: ReadonlyMap<string, I18nText>): ArticleContext {
  const districts = new Map<string, UnitRef>(org.districts().map((d) => [d.id, org.ref(d.id)]));
  return { mediaBase, districts, categoryLabels };
}

const CENTENARY: string[] = ["centenary_national", "centenary_state"];
const matches = (d: NativeDoc, c: ArticlesQuery["c"]) => c === "all" || (c === "centenary" ? CENTENARY.includes(d.data.category) : d.data.category === c);

/** Public article listing: native articles merged with legacy posts they do not shadow, newest first. */
export async function listMerged(repo: DataRepo, deps: ServiceDeps, c: ArticleCategoryFilter, offset: number, limit: number): Promise<{ rows: Article[]; total: number }> {
  const org = await loadOrg(repo);
  const ctx = articleContext(org, deps.mediaBase, await contentTypeLabels(repo));
  const [live, all] = await Promise.all([nativeLive(repo, deps.now()), nativeAll(repo)]);
  // Hidden/draft copies shadow their legacy post too (an editor unpublished it).
  const shadow = all.map((d) => d.data.legacyId).filter((x): x is number => x !== null);
  const nat = live.filter((d) => matches(d, c));
  const legacy = await repo.listArticles({ categories: legacyLettersFor(c), excludeIds: shadow, limit: offset + limit, offset: 0 });
  const merged: { at: number; art: () => Article }[] = [
    ...nat.map((d) => ({ at: shownAt(d).getTime(), art: () => nativeToArticle(d, ctx) })),
    ...legacy.rows.map((r) => ({ at: r.createdAt.getTime(), art: () => toArticle(r, ctx) })),
  ].sort((x, y) => y.at - x.at);
  return { rows: merged.slice(offset, offset + limit).map((m) => m.art()), total: legacy.total + nat.length };
}

export function createArticlesService(repo: DataRepo, deps: ServiceDeps): ArticlesService {
  return {
    async list(q: ArticlesQuery): Promise<Paged<Article>> {
      const { rows, total } = await listMerged(repo, deps, q.c, pageOffset(q.page, q.pageSize), q.pageSize);
      return { data: rows, meta: { page: q.page, pageSize: q.pageSize, total } };
    },

    async goldenStories(locale, limit) {
      const { rows } = await listMerged(repo, deps, GOLDEN_STORIES_SLUG, 0, Math.max(1, Math.min(limit, 24)));
      return rows.map((a) => {
        const title = a.title[locale] || a.title.en;
        const plain = (a.summary[locale] || a.summary.en || stripTags(a.bodyHtml[locale] || a.bodyHtml.en)).trim();
        return { title, excerpt: plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}...` : plain, href: `/news/${a.slug}`, ...(a.cover ? { image: a.cover } : {}) };
      });
    },

    async exists(slug: string): Promise<boolean> {
      const now = deps.now();
      const nat = (await nativeAll(repo)).find((d) => d.data.slug === slug);
      if (nat) return isLive(nat.data, now);
      const rec = await repo.articleBySlug(slug);
      if (!rec || (rec.i18n && rec.i18n.status !== "published")) return false;
      return !(await nativeAll(repo)).some((d) => d.data.legacyId === rec.id);
    },

    async bySlug(slug: string): Promise<ArticleDetail | null> {
      const now = deps.now();
      const org = await loadOrg(repo);
      const ctx = articleContext(org, deps.mediaBase, await contentTypeLabels(repo));
      const all = await nativeAll(repo);
      const natDoc = all.find((d) => d.data.slug === slug);
      let rec: ArticleRec | null;
      let article: Article;
      let others: NativeDoc[] = [];
      if (natDoc) {
        if (!isLive(natDoc.data, now)) return null;
        rec = nativeAsRec(natDoc);
        article = nativeToArticle(natDoc, ctx);
        others = (await nativeLive(repo, now)).filter((d) => d.id !== natDoc.id);
      } else {
        rec = await repo.articleBySlug(slug);
        if (!rec || (rec.i18n && rec.i18n.status !== "published")) return null;
        // A native copy (even hidden) replaces the legacy post.
        if (all.some((d) => d.data.legacyId === rec?.id)) return null;
        article = toArticle(rec, ctx);
      }
      const eventId = article.eventId;
      const [{ prev, next }, related, ev] = await Promise.all([
        natDoc && natDoc.data.legacyId === null ? Promise.resolve({ prev: null, next: null }) : repo.articleNeighbours(rec),
        repo.listArticles({ categories: legacyLettersFor(article.category), excludeIds: all.map((d) => d.data.legacyId).filter((x): x is number => x !== null), limit: 4, offset: 0 }),
        eventId ? repo.eventById(eventId) : Promise.resolve(null),
      ]);
      const [event] = ev ? await assembleEvents(repo, org, [ev]) : [];
      const sibling = (d: NativeDoc | undefined): ArticleRef | null => (d ? { slug: d.data.slug, category: isBuiltinCategory(d.data.category) ? d.data.category : "news", title: d.data.title, publishedAt: shownAt(d).toISOString() } : null);
      const at = new Date(article.publishedAt).getTime();
      const older = others.filter((d) => shownAt(d).getTime() < at);
      const newer = others.filter((d) => shownAt(d).getTime() > at).reverse();
      const relatedAll = [
        ...others.filter((d) => d.data.category === article.category).map((d) => nativeToArticle(d, ctx)),
        ...related.rows.filter((r) => r.id !== rec?.id).map((r) => toArticle(r, ctx)),
      ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      return {
        ...article,
        prev: prev ? toArticleRef(prev) : natDoc && natDoc.data.legacyId === null ? sibling(older[0]) : null,
        next: next ? toArticleRef(next) : natDoc && natDoc.data.legacyId === null ? sibling(newer[0]) : null,
        related: relatedAll.filter((r) => r.slug !== slug).slice(0, 3),
        event: event ?? null,
      };
    },
  };
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
