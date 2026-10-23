import "server-only";
import { and, asc, count, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { newId } from "../db/columns";
import { M6_DOC_TABLES } from "../db/schema/m6";
import { auditLog, centre, centreGathering, event, impactEstimate, partner, setting, sevaType } from "../db/tables";
import { affected, isDuplicateKey, type Tx } from "./links-db";
import { partnerCols } from "./partner-cols";
import type { DocListQuery, DocPutResult, DocRec, DocTableName, DocWrite, M6Repo } from "./m6-types";
import type { AuditRec, CentreRec, EstimateRec, GatheringRec, PartnerRec, SevaTypeRec } from "./types";

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
}
