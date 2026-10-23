// Discourse storage records and the repository port (M7). Services hold the rules (flag, publish
// gating, related/featured); repos only store. B2 extends this port with workspace writes.
import type { DiscourseBlockStatus, DiscourseBlockType, DiscourseStatus, DiscourseTheme, GlossaryTerm } from "@/contract";
import type { DiscourseSnapshot } from "../db/schema/discourses";

export interface DiscourseRec {
  id: string;
  n: number;
  slug: string;
  titleEn: string;
  titleHi: string | null;
  whyEn: string;
  whyHi: string | null;
  collPrint: string;
  collOnline: string | null;
  dateText: string;
  isoDate: string | null;
  place: string;
  occasion: string;
  sourceUrl: string | null;
  pdfUrl: string | null;
  retrieved: string | null;
  themes: DiscourseTheme[];
  status: DiscourseStatus;
  reviewerId: string | null;
  notes: string[];
  quotes: { en: string; hi: string | null; blockId: string | null }[];
  publishedAt: Date | null;
  publishedSnapshot: DiscourseSnapshot | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscourseBlockRec {
  discourseId: string;
  blockId: string;
  idx: number;
  type: DiscourseBlockType;
  en: string;
  hi: string | null;
  hiAi: string | null;
  status: DiscourseBlockStatus;
}

/** A published discourse as served: the snapshot written at publish time. */
export interface PublishedDiscourse {
  slug: string;
  publishedAt: Date;
  snapshot: DiscourseSnapshot;
}

export interface DiscourseRepo {
  /** Published discourses, `n` order. `withBlocks: false` returns snapshots with empty `blocks` (cheap list). */
  published(opts?: { withBlocks?: boolean }): Promise<PublishedDiscourse[]>;
  publishedBySlug(slug: string): Promise<PublishedDiscourse | null>;
  glossary(): Promise<GlossaryTerm[]>;
}
