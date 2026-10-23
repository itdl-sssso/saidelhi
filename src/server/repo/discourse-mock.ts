import type { GlossaryTerm } from "@/contract";
import { type DiscourseFixture, discourseFixtures, discourseGlossaryFixture } from "../mock/fixtures/discourses";
import type { DiscourseRepo, PublishedDiscourse } from "./discourse-types";

/** In-memory discourse store over the synthetic fixtures. */
export class MemoryDiscourseRepo implements DiscourseRepo {
  readonly items: DiscourseFixture[] = discourseFixtures();
  readonly glossaryTerms: GlossaryTerm[] = structuredClone(discourseGlossaryFixture);

  private toPublished(f: DiscourseFixture, withBlocks: boolean): PublishedDiscourse | null {
    const { rec } = f;
    if (rec.status !== "published" || !rec.publishedSnapshot || !rec.publishedAt) return null;
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
}
