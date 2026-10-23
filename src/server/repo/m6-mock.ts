import type { Fixtures } from "../mock/fixtures";
import type { DocListQuery, DocPutResult, DocRec, DocTableName, DocWrite, M6Repo } from "./m6-types";
import type { AuditRec, CentreRec, GatheringRec, PartnerRec, SevaTypeRec } from "./types";

/** In-memory M6 store (writes stay in memory). */
export class MemoryM6Repo implements M6Repo {
  private readonly tables = new Map<DocTableName, Map<string, DocRec>>();
  /** Insert order stands in for created_at (timestamps can tie inside one test). */
  private readonly order = new Map<string, number>();
  private seq = 0;

  constructor(
    private readonly fx: Fixtures,
    private readonly pushAudit: (rec: AuditRec) => Promise<void>,
  ) {}

  private t(name: DocTableName) {
    let m = this.tables.get(name);
    if (!m) this.tables.set(name, (m = new Map()));
    return m;
  }

  private async audit(audit?: AuditRec[]) {
    for (const a of audit ?? []) await this.pushAudit(a);
  }

  async docGet<T>(table: DocTableName, id: string) {
    const r = this.t(table).get(id);
    return r ? (structuredClone(r) as DocRec<T>) : null;
  }

  async docList<T>(table: DocTableName, q: DocListQuery = {}) {
    let rows = [...this.t(table).values()].filter((r) => (q.k1 === undefined || r.k1 === q.k1) && (q.k2 === undefined || r.k2 === q.k2));
    const seq = (r: DocRec) => this.order.get(`${table}:${r.id}`) ?? 0;
    rows.sort((a, b) => seq(a) - seq(b));
    if ((q.order ?? "desc") === "desc") rows.reverse();
    if (q.limit) rows = rows.slice(0, q.limit);
    return structuredClone(rows) as DocRec<T>[];
  }

  private put<T>(table: DocTableName, prev: DocRec | undefined, w: DocWrite<T>, version: number) {
    this.t(table).set(w.id, {
      id: w.id,
      k1: w.k1 ?? null,
      k2: w.k2 ?? null,
      version,
      data: structuredClone(w.data),
      createdAt: prev?.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
    if (!prev) this.order.set(`${table}:${w.id}`, ++this.seq);
  }

  async docInsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult> {
    if (this.t(table).has(w.id)) return { ok: false, reason: "duplicate" };
    this.put(table, undefined, w, 1);
    await this.audit(audit);
    return { ok: true, version: 1 };
  }

  async docUpdate<T>(table: DocTableName, w: DocWrite<T>, expectVersion?: number, audit?: AuditRec[]): Promise<DocPutResult> {
    const prev = this.t(table).get(w.id);
    if (!prev || (expectVersion !== undefined && prev.version !== expectVersion)) return { ok: false, reason: "conflict" };
    this.put(table, prev, w, prev.version + 1);
    await this.audit(audit);
    return { ok: true, version: prev.version + 1 };
  }

  async docUpsert<T>(table: DocTableName, w: DocWrite<T>, audit?: AuditRec[]): Promise<DocPutResult> {
    const prev = this.t(table).get(w.id);
    const version = (prev?.version ?? 0) + 1;
    this.put(table, prev, w, version);
    await this.audit(audit);
    return { ok: true, version };
  }

  async docDelete(table: DocTableName, id: string, audit?: AuditRec[]) {
    const had = this.t(table).delete(id);
    if (had) await this.audit(audit);
    return had;
  }

  async sevaTypeInsert(rec: SevaTypeRec, audit?: AuditRec[]) {
    if (this.fx.sevaTypes.some((s) => s.code === rec.code)) return "duplicate" as const;
    this.fx.sevaTypes.push({ ...rec, version: 1 });
    await this.audit(audit);
    return "ok" as const;
  }

  async sevaTypeUpdate(code: string, patch: Partial<Omit<SevaTypeRec, "code">>, expectVersion: number, audit?: AuditRec[]) {
    const s = this.fx.sevaTypes.find((x) => x.code === code);
    if (!s || (s.version ?? 1) !== expectVersion) return "conflict" as const;
    Object.assign(s, patch, { version: expectVersion + 1 });
    await this.audit(audit);
    return "ok" as const;
  }

  async partnersAll() {
    return [...this.fx.partners].sort((a, b) => a.name.localeCompare(b.name));
  }

  async partnerInsert(rec: PartnerRec, audit?: AuditRec[]) {
    this.fx.partners.push({ ...rec, version: 1 });
    await this.audit(audit);
  }

  async partnerUpdate(id: string, patch: Partial<Omit<PartnerRec, "id">>, expectVersion: number, audit?: AuditRec[]) {
    const p = this.fx.partners.find((x) => x.id === id);
    if (!p || (p.version ?? 1) !== expectVersion) return "conflict" as const;
    Object.assign(p, patch, { version: expectVersion + 1 });
    await this.audit(audit);
    return "ok" as const;
  }

  async eventCountsByPartner(from: Date, to: Date) {
    const out = new Map<string, number>();
    for (const e of this.fx.events) {
      if (!e.partnerId || e.startsAt < from || e.startsAt >= to) continue;
      out.set(e.partnerId, (out.get(e.partnerId) ?? 0) + 1);
    }
    return out;
  }

  async centreInsert(rec: CentreRec, gatherings: GatheringRec[], audit?: AuditRec[]) {
    if (this.fx.centres.some((c) => c.slug === rec.slug)) return "duplicate" as const;
    this.fx.centres.push({ ...rec, version: 1, updatedAt: new Date() });
    this.fx.gatherings.push(...gatherings);
    await this.audit(audit);
    return "ok" as const;
  }

  async centreUpdate(id: string, patch: Partial<Omit<CentreRec, "id" | "version" | "updatedAt">>, gatherings: GatheringRec[] | null, expectVersion: number, audit?: AuditRec[]) {
    const c = this.fx.centres.find((x) => x.id === id);
    if (!c || (c.version ?? 1) !== expectVersion) return "conflict" as const;
    if (patch.slug && this.fx.centres.some((x) => x.slug === patch.slug && x.id !== id)) return "duplicate" as const;
    Object.assign(c, patch, { version: expectVersion + 1, updatedAt: new Date() });
    if (gatherings) {
      const keep = this.fx.gatherings.filter((g) => g.centreId !== id);
      this.fx.gatherings.length = 0;
      this.fx.gatherings.push(...keep, ...gatherings);
    }
    await this.audit(audit);
    return "ok" as const;
  }

  async setSetting(key: string, value: unknown, _userId: string | null, audit?: AuditRec[]) {
    this.fx.settings[key] = structuredClone(value);
    await this.audit(audit);
  }
}
