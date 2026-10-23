import type { ContentKind, PartnerKind } from "@/contract";
import { PUBLIC_ARTICLE_LETTERS } from "../domain/articles";
import { type Fixtures, loadFixtures, portalFixtures, waFixtures } from "../mock/fixtures";
import { DEV_SESSION_SECRET } from "../security/crypto";
import { MemoryLinksRepo } from "./links-mock";
import { MemoryDiscourseRepo } from "./discourse-mock";
import { MemoryM6Repo } from "./m6-mock";
import { MemoryPrivacyRepo } from "./privacy-mock";
import { MemoryPortalRepo } from "./portal-mock";
import { MemoryWaRepo } from "./wa-mock";
import type { ArticleFilter, ArticleRec, AuditRec, DataRepo, EventFilter, PrivacyRequestRec, RedirectRec } from "./types";

const isPublished = (a: ArticleRec) => (!a.i18n || a.i18n.status === "published") && PUBLIC_ARTICLE_LETTERS.includes(a.category as never);
const byNewest = (a: ArticleRec, b: ArticleRec) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id;

/** In-memory repository over src/server/mock/fixtures. Writes stay in memory. */
export class MockRepo implements DataRepo {
  readonly kind = "mock" as const;
  readonly privacyRequests: PrivacyRequestRec[] = [];
  readonly audit: AuditRec[] = [];
  /** Manual / migration redirect rows (tests push into this). */
  readonly redirects: RedirectRec[] = [];

  readonly links: MemoryLinksRepo;
  readonly portal: MemoryPortalRepo;
  readonly wa: MemoryWaRepo;
  readonly m6: MemoryM6Repo;
  readonly privacy: MemoryPrivacyRepo;
  readonly discourses: MemoryDiscourseRepo;

  constructor(
    private readonly fx: Fixtures = loadFixtures(),
    secret: string = DEV_SESSION_SECRET,
  ) {
    this.links = new MemoryLinksRepo(fx, secret);
    this.portal = new MemoryPortalRepo(fx, this.links, portalFixtures(secret));
    this.wa = new MemoryWaRepo(waFixtures(secret));
    this.privacy = new MemoryPrivacyRepo(this.privacyRequests, this.links, this.wa, (rec) => this.portal.insertAudit(rec));
    this.discourses = new MemoryDiscourseRepo((rec) => this.portal.insertAudit(rec));
    this.m6 = new MemoryM6Repo(fx, (rec) => this.portal.insertAudit(rec), this.redirects);
  }

  async orgUnits() {
    return this.fx.orgUnits;
  }

  async sevaTypes() {
    return this.fx.sevaTypes;
  }

  async partners(ids: readonly string[]) {
    return this.fx.partners.filter((p) => ids.includes(p.id));
  }

  async partnersByKind(kinds: readonly PartnerKind[]) {
    return this.fx.partners.filter((p) => p.active && kinds.includes(p.kind)).sort((a, b) => a.name.localeCompare(b.name));
  }

  async articlesForEvents(eventIds: readonly string[], limit: number) {
    return this.fx.articles
      .filter(isPublished)
      .filter((a) => a.i18n?.eventId && eventIds.includes(a.i18n.eventId))
      .sort(byNewest)
      .slice(0, limit);
  }

  async redirectByPath(path: string) {
    return this.redirects.find((r) => r.fromPath === path) ?? null;
  }

  async redirectHit(path: string) {
    const r = this.redirects.find((x) => x.fromPath === path);
    if (r) r.hits += 1;
  }

  async settings(keys: readonly string[]) {
    return new Map(keys.filter((k) => k in this.fx.settings).map((k) => [k, this.fx.settings[k]]));
  }

  async centres() {
    return this.fx.centres;
  }

  async centreBySlug(slug: string) {
    return this.fx.centres.find((c) => c.slug === slug) ?? null;
  }

  async gatherings(centreIds: readonly string[]) {
    return this.fx.gatherings.filter((g) => centreIds.includes(g.centreId));
  }

  async listEvents(f: EventFilter) {
    const rows = this.fx.events
      .filter((e) => f.statuses.includes(e.status))
      .filter((e) => !f.from || e.startsAt.getTime() >= f.from.getTime())
      .filter((e) => !f.to || e.startsAt.getTime() < f.to.getTime())
      .filter((e) => !f.districtId || e.districtId === f.districtId)
      .filter((e) => !f.samithiId || e.samithiId === f.samithiId)
      .filter((e) => !f.sevaType || e.sevaType === f.sevaType)
      .filter((e) => f.recurring === undefined || e.recurring === f.recurring)
      .filter((e) => f.needsVolunteers === undefined || (e.volunteersNeeded !== null && e.volunteersNeeded > e.volunteersJoined) === f.needsVolunteers)
      .sort((a, b) => (f.order === "asc" ? 1 : -1) * (a.startsAt.getTime() - b.startsAt.getTime()) || a.id.localeCompare(b.id));
    return { rows: rows.slice(f.offset, f.offset + f.limit), total: rows.length };
  }

  async eventById(id: string) {
    return this.fx.events.find((e) => e.id === id) ?? null;
  }

  async approvedFacts(f: { from?: Date; to?: Date; eventIds?: readonly string[] }) {
    const events = new Map(this.fx.events.filter((e) => e.status === "approved").map((e) => [e.id, e]));
    return this.fx.kpiFacts.flatMap((fact) => {
      const event = events.get(fact.eventId);
      if (!event || fact.approvedAt === null) return [];
      if (f.eventIds && !f.eventIds.includes(fact.eventId)) return [];
      if (f.from && event.startsAt < f.from) return [];
      if (f.to && event.startsAt >= f.to) return [];
      return [{ ...fact, event }];
    });
  }

  async estimates(f: { fromMonth?: string; toMonth?: string }) {
    return this.fx.estimates.filter((e) => (!f.fromMonth || e.month >= f.fromMonth) && (!f.toMonth || e.month <= f.toMonth));
  }

  async articleSlugsForEvents(eventIds: readonly string[]) {
    const out = new Map<string, string>();
    for (const a of this.fx.articles) {
      const ev = a.i18n?.eventId;
      if (ev && eventIds.includes(ev) && isPublished(a) && !out.has(ev)) out.set(ev, a.slug);
    }
    return out;
  }

  async listArticles(f: ArticleFilter) {
    const rows = this.fx.articles
      .filter(isPublished)
      .filter((a) => !f.categories || f.categories.includes(a.category))
      .filter((a) => !f.excludeIds?.includes(a.id))
      .sort(byNewest);
    return { rows: rows.slice(f.offset, f.offset + f.limit), total: rows.length };
  }

  async articleBySlug(slug: string) {
    return this.fx.articles.find((a) => a.slug === slug && PUBLIC_ARTICLE_LETTERS.includes(a.category as never)) ?? null;
  }

  async articleNeighbours(article: ArticleRec) {
    const list = this.fx.articles.filter(isPublished).sort(byNewest);
    const i = list.findIndex((a) => a.id === article.id);
    // prev = older, next = newer
    return { prev: i >= 0 ? (list[i + 1] ?? null) : null, next: i > 0 ? list[i - 1] : null };
  }

  async contentItems(kind: ContentKind) {
    return this.fx.contentItems.filter((c) => c.kind === kind);
  }

  async createPrivacyRequest(rec: PrivacyRequestRec, audit: AuditRec) {
    this.privacyRequests.push(rec);
    this.audit.push(audit);
  }
}
