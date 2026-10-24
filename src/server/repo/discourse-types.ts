// Discourse storage records and the repository port (M7). Services hold the rules (flag, publish
// gating, related/featured); repos only store. B2 extends this port with workspace writes.
import type { DiscourseBlockStatus, DiscourseBlockType, DiscourseStatus, DiscourseTheme, GlossaryTerm } from "@/contract";
import type { DiscourseSnapshot } from "../db/schema/discourses";
import type { AuditRec } from "./types";

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

export interface DiscourseAdminRow {
  rec: DiscourseRec;
  counts: { total: number; approved: number; empty: number };
}

/** Partial write applied under an optimistic `version` check (version is bumped by the repo). */
export interface DiscourseChange {
  rec?: Partial<Omit<DiscourseRec, "id" | "version" | "createdAt" | "updatedAt">>;
  /** Per paragraph; omitted keys stay as they are. */
  blocks?: { blockId: string; hi?: string | null; status?: DiscourseBlockStatus }[];
}

export interface DiscourseRepo {
  /** Published discourses, `n` order. `withBlocks: false` returns snapshots with empty `blocks` (cheap list). */
  published(opts?: { withBlocks?: boolean }): Promise<PublishedDiscourse[]>;
  publishedBySlug(slug: string): Promise<PublishedDiscourse | null>;
  glossary(): Promise<GlossaryTerm[]>;

  // ---- Workspace (B2) ----
  /** Every discourse with paragraph counts, `n` order (workspace list; ~100 rows). */
  adminRows(): Promise<DiscourseAdminRow[]>;
  byId(id: string): Promise<{ rec: DiscourseRec; blocks: DiscourseBlockRec[] } | null>;
  /** Highest `n` in use (0 when empty). */
  maxN(): Promise<number>;
  slugs(): Promise<Set<string>>;
  insert(rec: DiscourseRec, blocks: DiscourseBlockRec[], audit: AuditRec[]): Promise<"ok" | "duplicate">;
  update(id: string, expectVersion: number, change: DiscourseChange, audit: AuditRec[]): Promise<"ok" | "conflict">;

  // ---- Media (M7.1) ----
  /** All candidates of a discourse, `sort` order. */
  mediaFor(discourseId: string): Promise<DiscourseMediaRec[]>;
  /** Approved candidates of a published discourse (public page), `sort` order. */
  approvedMediaBySlug(slug: string): Promise<DiscourseMediaRec[]>;
  /** Approve/hide and/or reorder one candidate; no discourse version bump. */
  updateMedia(discourseId: string, mediaId: string, change: { approved?: boolean; sort?: number }, audit: AuditRec[]): Promise<"ok" | "missing">;
}

/** One audio/video candidate of a discourse (M7.1). */
export interface DiscourseMediaRec {
  id: string;
  discourseId: string;
  kind: "audio" | "video";
  provider: "radiosai" | "youtube";
  url: string;
  externalId: string | null;
  title: string;
  channel: string | null;
  durationS: number | null;
  recordedDate: string | null;
  official: boolean;
  confidence: "high" | "medium" | "low" | null;
  score: number | null;
  sourcePage: string | null;
  approved: boolean;
  sort: number;
}
