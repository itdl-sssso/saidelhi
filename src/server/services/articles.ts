import type { Article, ArticleDetail, ArticlesQuery, Paged, UnitRef } from "@/contract";
import { legacyLettersFor, toArticle, toArticleRef, type ArticleContext } from "../domain/articles";
import type { DataRepo } from "../repo/types";
import { assembleEvents } from "./event-assembler";
import type { OrgIndex } from "./org-index";
import { loadOrg, pageOffset } from "./shared";
import type { ArticlesService, ServiceDeps } from "./types";

export function articleContext(org: OrgIndex, mediaBase: string): ArticleContext {
  const districts = new Map<string, UnitRef>(org.districts().map((d) => [d.id, org.ref(d.id)]));
  return { mediaBase, districts };
}

export function createArticlesService(repo: DataRepo, deps: ServiceDeps): ArticlesService {
  return {
    async list(q: ArticlesQuery): Promise<Paged<Article>> {
      const org = await loadOrg(repo);
      const ctx = articleContext(org, deps.mediaBase);
      const { rows, total } = await repo.listArticles({
        categories: legacyLettersFor(q.c),
        limit: q.pageSize,
        offset: pageOffset(q.page, q.pageSize),
      });
      return { data: rows.map((r) => toArticle(r, ctx)), meta: { page: q.page, pageSize: q.pageSize, total } };
    },

    async bySlug(slug: string): Promise<ArticleDetail | null> {
      const rec = await repo.articleBySlug(slug);
      if (!rec || (rec.i18n && rec.i18n.status !== "published")) return null;
      const org = await loadOrg(repo);
      const ctx = articleContext(org, deps.mediaBase);
      const [{ prev, next }, related, ev] = await Promise.all([
        repo.articleNeighbours(rec),
        repo.listArticles({ categories: [rec.category], limit: 4, offset: 0 }),
        rec.i18n?.eventId ? repo.eventById(rec.i18n.eventId) : Promise.resolve(null),
      ]);
      const [event] = ev ? await assembleEvents(repo, org, [ev]) : [];
      return {
        ...toArticle(rec, ctx),
        prev: prev ? toArticleRef(prev) : null,
        next: next ? toArticleRef(next) : null,
        related: related.rows.filter((r) => r.id !== rec.id).slice(0, 3).map((r) => toArticle(r, ctx)),
        event: event ?? null,
      };
    },
  };
}
