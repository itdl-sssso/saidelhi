import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, type SQL, sql } from "drizzle-orm";
import type { ContentKind } from "@/contract";
import type { Db } from "../db/client";
import { DbLinksRepo } from "./links-db";
import { toEventRec } from "./event-row";
import { DbPortalRepo } from "./portal-db";
import { DbWaRepo } from "./wa-db";
import { postcontentContentpostimage as postImage, postcontentPostcontent as post } from "../db/legacy";
import {
  articleI18n,
  auditLog,
  centre,
  centreGathering,
  contentItem,
  event,
  impactEstimate,
  orgUnit,
  partner,
  privacyRequest,
  setting,
  sevaType,
  submissionAnswerKpi,
} from "../db/tables";
import type {
  ArticleFilter,
  ArticleI18nRec,
  ArticleRec,
  AuditRec,
  DataRepo,
  EventFilter,
  PrivacyRequestRec,
} from "./types";

type I18nRow = typeof articleI18n.$inferSelect;

const toI18n = (r: I18nRow | null): ArticleI18nRec | null =>
  r
    ? {
        legacyId: r.legacyId,
        titleHi: r.titleHi,
        summaryHi: r.summaryHi,
        bodyHi: r.bodyHi,
        districtId: r.districtId,
        eventId: r.eventId,
        status: r.status,
      }
    : null;

/** Legacy posts without a side row, or with status 'published'. */
const articlePublished = or(isNull(articleI18n.status), eq(articleI18n.status, "published"));

export class DbRepo implements DataRepo {
  readonly kind = "db" as const;

  readonly links: DbLinksRepo;
  readonly portal: DbPortalRepo;
  readonly wa: DbWaRepo;

  constructor(private readonly db: Db) {
    this.links = new DbLinksRepo(db);
    this.portal = new DbPortalRepo(db);
    this.wa = new DbWaRepo(db);
  }

  async orgUnits() {
    return this.db
      .select({
        id: orgUnit.id,
        code: orgUnit.code,
        kind: orgUnit.kind,
        nameEn: orgUnit.nameEn,
        nameHi: orgUnit.nameHi,
        slug: orgUnit.slug,
        parentId: orgUnit.parentId,
        introEn: orgUnit.introEn,
        introHi: orgUnit.introHi,
        sortOrder: orgUnit.sortOrder,
        active: orgUnit.active,
        mergedIntoId: orgUnit.mergedIntoId,
        version: orgUnit.version,
      })
      .from(orgUnit);
  }

  async sevaTypes() {
    return this.db
      .select({
        code: sevaType.code,
        labelEn: sevaType.labelEn,
        labelHi: sevaType.labelHi,
        icon: sevaType.icon,
        wing: sevaType.wing,
        sortOrder: sevaType.sortOrder,
        active: sevaType.active,
      })
      .from(sevaType)
      .orderBy(asc(sevaType.sortOrder));
  }

  async partners(ids: readonly string[]) {
    if (ids.length === 0) return [];
    return this.db
      .select({ id: partner.id, name: partner.name, kind: partner.kind, city: partner.city, active: partner.active })
      .from(partner)
      .where(inArray(partner.id, [...ids]));
  }

  async settings(keys: readonly string[]) {
    if (keys.length === 0) return new Map<string, unknown>();
    const rows = await this.db.select({ key: setting.key, value: setting.value }).from(setting).where(inArray(setting.key, [...keys]));
    return new Map<string, unknown>(rows.map((r) => [r.key, r.value]));
  }

  private centreColumns = {
    id: centre.id,
    slug: centre.slug,
    samithiId: centre.samithiId,
    nameEn: centre.nameEn,
    nameHi: centre.nameHi,
    addressEn: centre.addressEn,
    addressHi: centre.addressHi,
    pincode: centre.pincode,
    lat: centre.lat,
    lng: centre.lng,
    contactPhone: centre.contactPhone,
    photos: centre.photos,
    active: centre.active,
  };

  async centres() {
    return this.db.select(this.centreColumns).from(centre);
  }

  async centreBySlug(slug: string) {
    const [row] = await this.db.select(this.centreColumns).from(centre).where(eq(centre.slug, slug)).limit(1);
    return row ?? null;
  }

  async gatherings(centreIds: readonly string[]) {
    if (centreIds.length === 0) return [];
    return this.db
      .select({
        id: centreGathering.id,
        centreId: centreGathering.centreId,
        day: centreGathering.day,
        time: centreGathering.time,
        kind: centreGathering.kind,
        language: centreGathering.language,
        sortOrder: centreGathering.sortOrder,
      })
      .from(centreGathering)
      .where(inArray(centreGathering.centreId, [...centreIds]));
  }

  async listEvents(f: EventFilter) {
    const conds: (SQL | undefined)[] = [
      inArray(event.status, [...f.statuses]),
      f.from ? gte(event.startsAt, f.from) : undefined,
      f.to ? lt(event.startsAt, f.to) : undefined,
      f.districtId ? eq(event.districtId, f.districtId) : undefined,
      f.samithiId ? eq(event.samithiId, f.samithiId) : undefined,
      f.sevaType ? eq(event.sevaType, f.sevaType) : undefined,
    ];
    if (f.needsVolunteers === true) {
      conds.push(and(isNotNull(event.volunteersNeeded), gt(event.volunteersNeeded, event.volunteersJoined)));
    } else if (f.needsVolunteers === false) {
      conds.push(or(isNull(event.volunteersNeeded), lte(event.volunteersNeeded, event.volunteersJoined)));
    }
    const where = and(...conds);
    const order = f.order === "asc" ? [asc(event.startsAt), asc(event.id)] : [desc(event.startsAt), desc(event.id)];
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(event).where(where).orderBy(...order).limit(f.limit).offset(f.offset),
      this.db.select({ total: count() }).from(event).where(where),
    ]);
    return { rows: rows.map(toEventRec), total };
  }

  async eventById(id: string) {
    const [row] = await this.db.select().from(event).where(eq(event.id, id)).limit(1);
    return row ? toEventRec(row) : null;
  }

  async approvedFacts(f: { from?: Date; to?: Date; eventIds?: readonly string[] }) {
    if (f.eventIds && f.eventIds.length === 0) return [];
    const rows = await this.db
      .select({ fact: submissionAnswerKpi, ev: event })
      .from(submissionAnswerKpi)
      .innerJoin(event, eq(event.id, submissionAnswerKpi.eventId))
      .where(
        and(
          eq(event.status, "approved"),
          isNotNull(submissionAnswerKpi.approvedAt),
          f.eventIds ? inArray(submissionAnswerKpi.eventId, [...f.eventIds]) : undefined,
          f.from ? gte(event.startsAt, f.from) : undefined,
          f.to ? lt(event.startsAt, f.to) : undefined,
        ),
      );
    return rows.map(({ fact, ev }) => ({
      id: fact.id,
      eventId: fact.eventId,
      submissionId: fact.submissionId,
      kpiKey: fact.kpiKey,
      dim: fact.dim,
      value: fact.value,
      estimate: fact.estimate,
      approvedAt: fact.approvedAt,
      event: toEventRec(ev),
    }));
  }

  async estimates(f: { fromMonth?: string; toMonth?: string }) {
    return this.db
      .select({
        id: impactEstimate.id,
        orgUnitId: impactEstimate.orgUnitId,
        sevaType: impactEstimate.sevaType,
        kpiKey: impactEstimate.kpiKey,
        month: impactEstimate.month,
        value: impactEstimate.value,
        note: impactEstimate.note,
        visible: impactEstimate.visible,
      })
      .from(impactEstimate)
      .where(
        and(
          f.fromMonth ? gte(impactEstimate.month, f.fromMonth) : undefined,
          f.toMonth ? lte(impactEstimate.month, f.toMonth) : undefined,
        ),
      );
  }

  async articleSlugsForEvents(eventIds: readonly string[]) {
    const out = new Map<string, string>();
    if (eventIds.length === 0) return out;
    const rows = await this.db
      .select({ eventId: articleI18n.eventId, slug: post.slug })
      .from(articleI18n)
      .innerJoin(post, eq(post.id, articleI18n.legacyId))
      .where(and(inArray(articleI18n.eventId, [...eventIds]), eq(articleI18n.status, "published")))
      .orderBy(desc(post.createdAt));
    for (const r of rows) if (r.eventId && !out.has(r.eventId)) out.set(r.eventId, r.slug);
    return out;
  }

  private async withGallery(rows: { post: typeof post.$inferSelect; i18n: I18nRow | null }[]): Promise<ArticleRec[]> {
    const ids = rows.map((r) => r.post.id);
    const images = ids.length
      ? await this.db
          .select({ postId: postImage.blogPostId, image: postImage.image, caption: postImage.caption, order: postImage.order })
          .from(postImage)
          .where(inArray(postImage.blogPostId, ids))
      : [];
    return rows.map(({ post: p, i18n }) => ({
      id: p.id,
      slug: p.slug,
      category: p.category,
      title: p.title,
      shortDescription: p.shortDescription,
      content: p.content,
      featuredImage: p.featuredImage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      i18n: toI18n(i18n),
      gallery: images.filter((g) => g.postId === p.id).map(({ image, caption, order }) => ({ image, caption, order })),
    }));
  }

  async listArticles(f: ArticleFilter) {
    const where = and(articlePublished, f.categories ? inArray(post.category, [...f.categories]) : undefined);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({ post, i18n: articleI18n })
        .from(post)
        .leftJoin(articleI18n, eq(articleI18n.legacyId, post.id))
        .where(where)
        .orderBy(desc(post.createdAt), desc(post.id))
        .limit(f.limit)
        .offset(f.offset),
      this.db.select({ total: count() }).from(post).leftJoin(articleI18n, eq(articleI18n.legacyId, post.id)).where(where),
    ]);
    return { rows: await this.withGallery(rows), total };
  }

  async articleBySlug(slug: string) {
    const rows = await this.db
      .select({ post, i18n: articleI18n })
      .from(post)
      .leftJoin(articleI18n, eq(articleI18n.legacyId, post.id))
      .where(eq(post.slug, slug))
      .limit(1);
    const [rec] = await this.withGallery(rows);
    return rec ?? null;
  }

  async articleNeighbours(a: ArticleRec) {
    // Compare against the stored datetime(6), not the ms-truncated JS Date.
    const at = sql`(SELECT p2.created_at FROM postcontent_postcontent p2 WHERE p2.id = ${a.id})`;
    const older = or(lt(post.createdAt, at), and(eq(post.createdAt, at), lt(post.id, a.id)));
    const newer = or(gt(post.createdAt, at), and(eq(post.createdAt, at), gt(post.id, a.id)));
    const pick = (cond: SQL | undefined, dir: "asc" | "desc") =>
      this.db
        .select({ post, i18n: articleI18n })
        .from(post)
        .leftJoin(articleI18n, eq(articleI18n.legacyId, post.id))
        .where(and(articlePublished, cond))
        .orderBy(dir === "desc" ? desc(post.createdAt) : asc(post.createdAt), dir === "desc" ? desc(post.id) : asc(post.id))
        .limit(1);
    const [prevRows, nextRows] = await Promise.all([pick(older, "desc"), pick(newer, "asc")]);
    // Neighbours only need title/slug: skip the gallery query.
    const lite = (r: { post: typeof post.$inferSelect; i18n: I18nRow | null } | undefined): ArticleRec | null =>
      r
        ? {
            id: r.post.id,
            slug: r.post.slug,
            category: r.post.category,
            title: r.post.title,
            shortDescription: r.post.shortDescription,
            content: null,
            featuredImage: r.post.featuredImage,
            createdAt: r.post.createdAt,
            updatedAt: r.post.updatedAt,
            i18n: toI18n(r.i18n),
            gallery: [],
          }
        : null;
    return { prev: lite(prevRows[0]), next: lite(nextRows[0]) };
  }

  async contentItems(kind: ContentKind) {
    return this.db
      .select({
        id: contentItem.id,
        kind: contentItem.kind,
        key: contentItem.key,
        titleEn: contentItem.titleEn,
        titleHi: contentItem.titleHi,
        bodyEn: contentItem.bodyEn,
        bodyHi: contentItem.bodyHi,
        sourceEn: contentItem.sourceEn,
        sourceHi: contentItem.sourceHi,
        href: contentItem.href,
        date: contentItem.date,
        status: contentItem.status,
        sortOrder: contentItem.sortOrder,
      })
      .from(contentItem)
      .where(eq(contentItem.kind, kind))
      .orderBy(desc(contentItem.date));
  }

  async createPrivacyRequest(rec: PrivacyRequestRec, audit: AuditRec) {
    await this.db.transaction(async (tx) => {
      await tx.insert(privacyRequest).values({ ...rec, status: "received" });
      await tx.insert(auditLog).values(audit);
    });
  }
}
