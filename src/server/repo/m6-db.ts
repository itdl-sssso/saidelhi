import "server-only";
import { and, asc, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { postcontentContentpostimage as postImage, postcontentPostcontent as post } from "../db/legacy";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import { M6_DOC_TABLES } from "../db/schema/m6";
import { articleI18n, auditLog, centre, centreGathering, contentItem, event, impactEstimate, partner, redirect, setting, sevaType } from "../db/tables";
import type { ContentKind } from "@/contract";
import { affected, isDuplicateKey, type Tx } from "./links-db";
import { partnerCols } from "./partner-cols";
import type { DocListQuery, DocPutResult, DocRec, DocTableName, DocWrite, M6Repo } from "./m6-types";
import type { ArticleI18nRec, ArticleRec, AuditRec, CentreRec, ContentItemRec, RedirectRec, EstimateRec, GatheringRec, PartnerRec, SevaTypeRec } from "./types";

class Conflict extends Error {}

const toRec = (r: DocRec): DocRec => ({ id: r.id, k1: r.k1, k2: r.k2, version: r.version, data: r.data, createdAt: r.createdAt, updatedAt: r.updatedAt });

export class DbM6Repo implements M6Repo {
  constructor(private readonly db: Db) {}

  private async audit(tx: Tx | Db, recs?: readonly AuditRec[]) {
    if (recs?.length) await tx.insert(auditLog).values(recs.map((r) => ({ ...r, id: newId() })));
  }

  async docGet<T>(table: DocTableName, id: string) {
    const t = M6_DOC_TABLES[table];
    const [r] = await this.db.select().from(t).where(eq(t.id, id)).limit(1);
    return r ? (toRec(r) as DocRec<T>) : null;
  }

  async docList<T>(table: DocTableName, q: DocListQuery = {}) {
    const t = M6_DOC_TABLES[table];
    const order = (q.order ?? "desc") === "desc" ? desc : asc;
    let query = this.db
      .select()
      .from(t)
      .where(and(q.k1 !== undefined ? eq(t.k1, q.k1) : undefined, q.k2 !== undefined ? eq(t.k2, q.k2) : undefined))
      .orderBy(order(t.createdAt), order(t.id))
      .$dynamic();
    if (q.limit) query = query.limit(q.limit);
    return (await query).map((r) => toRec(r) as DocRec<T>);
  }

  async docInsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult> {
    const t = M6_DOC_TABLES[table];
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(t).values({ id: w.id, k1: w.k1 ?? null, k2: w.k2 ?? null, version: 1, data: w.data });
        await this.audit(tx, audit);
      });
      return { ok: true, version: 1 };
    } catch (err) {
      if (isDuplicateKey(err)) return { ok: false, reason: "duplicate" };
      throw err;
    }
  }

  async docUpdate<T>(table: DocTableName, w: DocWrite<T>, expectVersion?: number, audit?: AuditRec[]): Promise<DocPutResult> {
    const t = M6_DOC_TABLES[table];
    try {
      let version = 0;
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(t)
          .set({ k1: w.k1 ?? null, k2: w.k2 ?? null, data: w.data, version: sql`${t.version} + 1` })
          .where(and(eq(t.id, w.id), expectVersion !== undefined ? eq(t.version, expectVersion) : undefined));
        if (affected(res) === 0) throw new Conflict();
        const [r] = await tx.select({ v: t.version }).from(t).where(eq(t.id, w.id)).limit(1);
        version = r?.v ?? 0;
        await this.audit(tx, audit);
      });
      return { ok: true, version };
    } catch (err) {
      if (err instanceof Conflict) return { ok: false, reason: "conflict" };
      throw err;
    }
  }

  async docUpsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult> {
    const t = M6_DOC_TABLES[table];
    let version = 1;
    await this.db.transaction(async (tx) => {
      await tx
        .insert(t)
        .values({ id: w.id, k1: w.k1 ?? null, k2: w.k2 ?? null, version: 1, data: w.data })
        .onDuplicateKeyUpdate({ set: { k1: w.k1 ?? null, k2: w.k2 ?? null, data: w.data, version: sql`${t.version} + 1` } });
      const [r] = await tx.select({ v: t.version }).from(t).where(eq(t.id, w.id)).limit(1);
      version = r?.v ?? 1;
      await this.audit(tx, audit);
    });
    return { ok: true, version };
  }

  async docDelete(table: DocTableName, id: string, audit?: AuditRec[]) {
    const t = M6_DOC_TABLES[table];
    let had = false;
    await this.db.transaction(async (tx) => {
      had = affected(await tx.delete(t).where(eq(t.id, id))) > 0;
      if (had) await this.audit(tx, audit);
    });
    return had;
  }

  async sevaTypeInsert(rec: SevaTypeRec, audit?: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(sevaType).values({
          code: rec.code,
          labelEn: rec.labelEn,
          labelHi: rec.labelHi,
          icon: rec.icon,
          wing: rec.wing,
          sortOrder: rec.sortOrder,
          active: rec.active,
          templateId: rec.templateId ?? null,
        });
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async sevaTypeUpdate(code: string, patch: Partial<Omit<SevaTypeRec, "code">>, expectVersion: number, audit?: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        const set = { ...patch };
        delete set.version;
        const res = await tx
          .update(sevaType)
          .set({ ...set, version: sql`${sevaType.version} + 1` })
          .where(and(eq(sevaType.code, code as never), eq(sevaType.version, expectVersion)));
        if (affected(res) === 0) throw new Conflict();
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (err instanceof Conflict) return "conflict" as const;
      throw err;
    }
  }

  async partnersAll() {
    return this.db.select(partnerCols).from(partner).orderBy(asc(partner.name));
  }

  async partnerInsert(rec: PartnerRec, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(partner).values({
        id: rec.id,
        name: rec.name,
        kind: rec.kind,
        city: rec.city,
        active: rec.active,
        nameHi: rec.nameHi ?? null,
        contact: rec.contact ?? null,
        showPublicly: rec.showPublicly ?? true,
      });
      await this.audit(tx, audit);
    });
  }

  async partnerUpdate(id: string, patch: Partial<Omit<PartnerRec, "id">>, expectVersion: number, audit?: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        const set = { ...patch };
        delete set.version;
        const res = await tx
          .update(partner)
          .set({ ...set, version: sql`${partner.version} + 1` })
          .where(and(eq(partner.id, id), eq(partner.version, expectVersion)));
        if (affected(res) === 0) throw new Conflict();
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (err instanceof Conflict) return "conflict" as const;
      throw err;
    }
  }

  async eventCountsByPartner(from: Date, to: Date) {
    const rows = await this.db
      .select({ id: event.partnerId, n: count() })
      .from(event)
      .where(and(isNotNull(event.partnerId), gte(event.startsAt, from), lt(event.startsAt, to)))
      .groupBy(event.partnerId);
    return new Map(rows.flatMap((r) => (r.id ? [[r.id, Number(r.n)] as const] : [])));
  }

  async centreInsert(rec: CentreRec, gatherings: GatheringRec[], audit?: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(centre).values({
          id: rec.id,
          slug: rec.slug,
          samithiId: rec.samithiId,
          nameEn: rec.nameEn,
          nameHi: rec.nameHi,
          addressEn: rec.addressEn,
          addressHi: rec.addressHi,
          pincode: rec.pincode,
          lat: rec.lat,
          lng: rec.lng,
          contactPhone: rec.contactPhone,
          photos: rec.photos,
          active: rec.active,
        });
        if (gatherings.length) await tx.insert(centreGathering).values(gatherings);
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async centreUpdate(id: string, patch: Partial<Omit<CentreRec, "id" | "version" | "updatedAt">>, gatherings: GatheringRec[] | null, expectVersion: number, audit?: AuditRec[]) {
    try {
      await this.db.transaction(async (tx) => {
        const res = await tx
          .update(centre)
          .set({ ...patch, version: sql`${centre.version} + 1` })
          .where(and(eq(centre.id, id), eq(centre.version, expectVersion)));
        if (affected(res) === 0) throw new Conflict();
        if (gatherings) {
          await tx.delete(centreGathering).where(eq(centreGathering.centreId, id));
          if (gatherings.length) await tx.insert(centreGathering).values(gatherings);
        }
        await this.audit(tx, audit);
      });
      return "ok" as const;
    } catch (err) {
      if (err instanceof Conflict) return "conflict" as const;
      if (isDuplicateKey(err)) return "duplicate" as const;
      throw err;
    }
  }

  async setSetting(key: string, value: unknown, userId: string | null, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(setting)
        .values({ key, value, updatedBy: userId })
        .onDuplicateKeyUpdate({ set: { value, updatedBy: userId } });
      await this.audit(tx, audit);
    });
  }

  async estimatesAll() {
    const rows = await this.db.select().from(impactEstimate);
    return rows.map((r) => ({
      id: r.id,
      orgUnitId: r.orgUnitId,
      sevaType: r.sevaType,
      kpiKey: r.kpiKey,
      month: r.month,
      value: r.value,
      note: r.note,
      visible: r.visible,
      period: r.period,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  }

  async estimateInsert(rec: EstimateRec, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(impactEstimate).values({
        id: rec.id,
        orgUnitId: rec.orgUnitId,
        sevaType: rec.sevaType,
        kpiKey: rec.kpiKey,
        month: rec.month,
        period: rec.period ?? "month",
        value: rec.value,
        note: rec.note,
        visible: rec.visible,
        createdBy: rec.createdBy ?? null,
      });
      await this.audit(tx, audit);
    });
  }

  async estimateUpdate(id: string, patch: Partial<Omit<EstimateRec, "id">>, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const set: Record<string, unknown> = {};
      for (const k of ["orgUnitId", "sevaType", "kpiKey", "month", "period", "value", "note", "visible"] as const) if (k in patch) set[k] = patch[k];
      const [cur] = await tx.select({ id: impactEstimate.id }).from(impactEstimate).where(eq(impactEstimate.id, id)).limit(1);
      if (!cur) return false;
      if (Object.keys(set).length) await tx.update(impactEstimate).set(set).where(eq(impactEstimate.id, id));
      await this.audit(tx, audit);
      return true;
    });
  }

  async estimateDelete(id: string, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const res = await tx.delete(impactEstimate).where(eq(impactEstimate.id, id));
      if (!affected(res)) return false;
      await this.audit(tx, audit);
      return true;
    });
  }

  private i18nOf(r: typeof articleI18n.$inferSelect | null): ArticleI18nRec | null {
    return r
      ? { legacyId: r.legacyId, titleHi: r.titleHi, summaryHi: r.summaryHi, bodyHi: r.bodyHi, districtId: r.districtId, eventId: r.eventId, status: r.status }
      : null;
  }

  async legacyPosts(opts: { withContent?: boolean } = {}): Promise<ArticleRec[]> {
    const rows = await this.db
      .select({
        id: post.id,
        slug: post.slug,
        category: post.category,
        title: post.title,
        shortDescription: post.shortDescription,
        content: opts.withContent ? post.content : sql<string | null>`NULL`,
        featuredImage: post.featuredImage,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        i18n: articleI18n,
      })
      .from(post)
      .leftJoin(articleI18n, eq(articleI18n.legacyId, post.id))
      .orderBy(desc(post.createdAt), desc(post.id));
    return rows.map(({ i18n, ...p }) => ({ ...p, i18n: this.i18nOf(i18n), gallery: [] }));
  }

  async legacyPost(id: number): Promise<ArticleRec | null> {
    const [r] = await this.db.select({ post, i18n: articleI18n }).from(post).leftJoin(articleI18n, eq(articleI18n.legacyId, post.id)).where(eq(post.id, id)).limit(1);
    if (!r) return null;
    const images = await this.db.select({ image: postImage.image, caption: postImage.caption, order: postImage.order }).from(postImage).where(eq(postImage.blogPostId, id));
    const p = r.post;
    return {
      id: p.id,
      slug: p.slug,
      category: p.category,
      title: p.title,
      shortDescription: p.shortDescription,
      content: p.content,
      featuredImage: p.featuredImage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      i18n: this.i18nOf(r.i18n),
      gallery: images,
    };
  }

  async articleI18nUpsert(rec: ArticleI18nRec, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(articleI18n).values(rec).onDuplicateKeyUpdate({ set: { titleHi: rec.titleHi, summaryHi: rec.summaryHi, bodyHi: rec.bodyHi, districtId: rec.districtId, eventId: rec.eventId, status: rec.status } });
      await this.audit(tx, audit);
    });
  }

  async legacySlugs() {
    return (await this.db.select({ slug: post.slug }).from(post)).map((r) => r.slug);
  }

  async contentItemsAll(kind?: ContentKind): Promise<ContentItemRec[]> {
    const rows = await this.db.select().from(contentItem).where(kind ? eq(contentItem.kind, kind) : undefined).orderBy(desc(contentItem.date), desc(contentItem.createdAt));
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      key: r.key,
      titleEn: r.titleEn,
      titleHi: r.titleHi,
      bodyEn: r.bodyEn,
      bodyHi: r.bodyHi,
      sourceEn: r.sourceEn,
      sourceHi: r.sourceHi,
      href: r.href,
      date: r.date,
      status: r.status,
      sortOrder: r.sortOrder,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      version: r.version,
      updatedAt: r.updatedAt,
    }));
  }

  async contentItemInsert(rec: ContentItemRec, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(contentItem).values({ ...rec, version: 1, updatedAt: undefined });
      await this.audit(tx, audit);
    });
  }

  async contentItemUpdate(id: string, patch: Partial<Omit<ContentItemRec, "id" | "kind">>, expectVersion: number, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const set = { ...patch, version: undefined, updatedAt: undefined };
      const res = await tx
        .update(contentItem)
        .set({ ...set, version: sql`${contentItem.version} + 1` })
        .where(and(eq(contentItem.id, id), eq(contentItem.version, expectVersion)));
      if (!affected(res)) return "conflict" as const;
      await this.audit(tx, audit);
      return "ok" as const;
    });
  }

  async contentItemDelete(id: string, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const res = await tx.delete(contentItem).where(eq(contentItem.id, id));
      if (!affected(res)) return false;
      await this.audit(tx, audit);
      return true;
    });
  }

  async redirectsAll() {
    const rows = await this.db.select().from(redirect).orderBy(desc(redirect.updatedAt));
    return rows.map((r) => ({ fromPath: r.fromPath, toPath: r.toPath, permanent: r.permanent, source: r.source, hits: r.hits, updatedAt: r.updatedAt }));
  }

  async redirectUpsert(rec: Omit<RedirectRec, "hits">, audit?: AuditRec[]) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(redirect)
        .values(rec)
        .onDuplicateKeyUpdate({ set: { toPath: rec.toPath, permanent: rec.permanent, source: rec.source } });
      await this.audit(tx, audit);
    });
  }

  async redirectDelete(from: string, audit?: AuditRec[]) {
    return this.db.transaction(async (tx) => {
      const res = await tx.delete(redirect).where(eq(redirect.fromPath, from));
      if (!affected(res)) return false;
      await this.audit(tx, audit);
      return true;
    });
  }
}
