// Admin-managed article types (v0.10). Stored as JSON docs in `content_type` (id = slug).
// Until a state admin first saves the list, the defaults below are served (and materialised on the first write).
import { type ContentTypeRow, type I18nText, isBuiltinCategory } from "@/contract";
import type { DocRec } from "../repo/m6-types";
import type { DataRepo } from "../repo/types";
import { nativeAll } from "./native-articles";

export interface ContentTypeData {
  slug: string;
  labelEn: string;
  labelHi: string | null;
  active: boolean;
  order: number;
}

export const DEFAULT_CONTENT_TYPES: readonly ContentTypeData[] = [
  { slug: "news", labelEn: "News", labelHi: "समाचार" },
  { slug: "activities", labelEn: "Activities", labelHi: "गतिविधियाँ" },
  { slug: "centenary_national", labelEn: "Centenary (national)", labelHi: "शताब्दी (राष्ट्रीय)" },
  { slug: "centenary_state", labelEn: "Centenary (state)", labelHi: "शताब्दी (राज्य)" },
  { slug: "key_programs", labelEn: "Key programmes", labelHi: "मुख्य कार्यक्रम" },
  { slug: "special_programs", labelEn: "Special programmes", labelHi: "विशेष कार्यक्रम" },
  { slug: "stories", labelEn: "Stories", labelHi: "कहानियाँ" },
  { slug: "golden-stories", labelEn: "Golden Stories", labelHi: "स्वर्णिम कहानियाँ" },
  { slug: "seva-report", labelEn: "Seva Report", labelHi: "सेवा रिपोर्ट" },
  { slug: "announcement", labelEn: "Announcement", labelHi: "घोषणा" },
].map((t, i) => ({ ...t, active: true, order: i }));

export const GOLDEN_STORIES_SLUG = "golden-stories";

export type ContentTypeDoc = DocRec<ContentTypeData>;

/** Stored docs in order, or defaults (version 0) when nothing is saved yet. */
export async function contentTypeDocs(repo: DataRepo): Promise<{ docs: ContentTypeDoc[]; stored: boolean }> {
  const docs = (await repo.m6.docList<ContentTypeData>("content_type")) as ContentTypeDoc[];
  if (docs.length) return { docs: docs.sort((a, b) => a.data.order - b.data.order || a.data.slug.localeCompare(b.data.slug)), stored: true };
  const at = new Date(0);
  return { docs: DEFAULT_CONTENT_TYPES.map((d) => ({ id: d.slug, k1: "1", k2: null, version: 0, data: d, createdAt: at, updatedAt: at })), stored: false };
}

export const toTypeRow = (d: ContentTypeDoc, articles = 0): ContentTypeRow => ({
  slug: d.data.slug,
  labelEn: d.data.labelEn,
  labelHi: d.data.labelHi,
  active: d.data.active,
  order: d.data.order,
  builtin: isBuiltinCategory(d.data.slug),
  articles,
  version: d.version,
});

/** slug -> display name, for DTOs (inactive types keep their name: their articles stay public). */
export async function contentTypeLabels(repo: DataRepo): Promise<Map<string, I18nText>> {
  const { docs } = await contentTypeDocs(repo);
  return new Map(docs.map((d) => [d.data.slug, { en: d.data.labelEn, hi: d.data.labelHi }]));
}

export async function contentTypeCounts(repo: DataRepo): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const d of await nativeAll(repo)) out.set(d.data.category, (out.get(d.data.category) ?? 0) + 1);
  return out;
}
