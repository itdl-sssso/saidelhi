import type { GlossaryTerm } from "@/contract";
import { type DiscourseFixture, discourseFixtures, discourseGlossaryFixture, discourseMediaFixtures } from "../mock/fixtures/discourses";
import type { AuditRec } from "./types";
import type { DiscourseAdminRow, DiscourseBlockRec, DiscourseChange, DiscourseMediaRec, DiscourseRec, DiscourseRepo, PublishedDiscourse } from "./discourse-types";

/** In-memory discourse store over the synthetic fixtures. */
export class MemoryDiscourseRepo implements DiscourseRepo {
  readonly items: DiscourseFixture[] = discourseFixtures();
  readonly glossaryTerms: GlossaryTerm[] = structuredClone(discourseGlossaryFixture);

  readonly media: DiscourseMediaRec[] = discourseMediaFixtures();

  constructor(private readonly pushAudit: (rec: AuditRec) => Promise<void> = async () => {}) {}

  private toPublished(f: DiscourseFixture, withBlocks: boolean): PublishedDiscourse | null {
    const { rec } = f;
    if (!rec.publishedSnapshot || !rec.publishedAt) return null;
    const snapshot = structuredClone(rec.publishedSnapshot);
    if (!withBlocks) snapshot.blocks = [];
    return { slug: rec.slug, publishedAt: rec.publishedAt, snapshot };
  }

  async published(opts: { withBlocks?: boolean } = {}) {
    return this.items
      .map((f) => this.toPublished(f, opts.withBlocks ?? true))
      .filter((p): p is PublishedDiscourse => p !== null)
      .sort((a, b) => a.snapshot.n - b.snapshot.n);
  }

  async publishedBySlug(slug: string) {
    const f = this.items.find((x) => x.rec.slug === slug);
    return f ? this.toPublished(f, true) : null;
  }

  async glossary() {
    return structuredClone(this.glossaryTerms);
  }

  async adminRows(): Promise<DiscourseAdminRow[]> {
    return this.items
      .map((f) => ({
        rec: structuredClone(f.rec),
        counts: {
          total: f.blocks.length,
          approved: f.blocks.filter((b) => b.status === "approved").length,
          empty: f.blocks.filter((b) => b.status === "empty").length,
        },
      }))
      .sort((a, b) => a.rec.n - b.rec.n);
  }

  async byId(id: string) {
    const f = this.items.find((x) => x.rec.id === id);
    return f ? { rec: structuredClone(f.rec), blocks: structuredClone(f.blocks) } : null;
  }

  async maxN() {
    return Math.max(0, ...this.items.map((f) => f.rec.n));
  }

  async slugs() {
    return new Set(this.items.map((f) => f.rec.slug));
  }

  async insert(rec: DiscourseRec, blocks: DiscourseBlockRec[], audit: AuditRec[]) {
    if (this.items.some((f) => f.rec.n === rec.n || f.rec.slug === rec.slug)) return "duplicate" as const;
    this.items.push({ rec: structuredClone(rec), blocks: structuredClone(blocks) });
    for (const a of audit) await this.pushAudit(a);
    return "ok" as const;
  }

  async update(id: string, expectVersion: number, change: DiscourseChange, audit: AuditRec[]) {
    const f = this.items.find((x) => x.rec.id === id);
    if (!f || f.rec.version !== expectVersion) return "conflict" as const;
    Object.assign(f.rec, structuredClone(change.rec ?? {}), { version: expectVersion + 1, updatedAt: new Date() });
    for (const c of change.blocks ?? []) {
      const b = f.blocks.find((x) => x.blockId === c.blockId);
      if (!b) continue;
      if (c.hi !== undefined) b.hi = c.hi;
      if (c.status !== undefined) b.status = c.status;
    }
    for (const a of audit) await this.pushAudit(a);
    return "ok" as const;
  }

  async mediaFor(discourseId: string) {
    return structuredClone(this.media.filter((m) => m.discourseId === discourseId).sort((a, b) => a.sort - b.sort));
  }

  async approvedMediaBySlug(slug: string) {
    const f = this.items.find((x) => x.rec.slug === slug);
    if (!f) return [];
    return structuredClone(this.media.filter((m) => m.discourseId === f.rec.id && m.approved).sort((a, b) => a.sort - b.sort));
  }

  async updateMedia(discourseId: string, mediaId: string, change: { approved?: boolean; sort?: number }, audit: AuditRec[]) {
    const m = this.media.find((x) => x.id === mediaId && x.discourseId === discourseId);
    if (!m) return "missing" as const;
    Object.assign(m, change);
    for (const a of audit) await this.pushAudit(a);
    return "ok" as const;
  }
}
