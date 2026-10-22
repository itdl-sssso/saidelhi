import { z } from "zod";

export const Locale = z.enum(["en", "hi"]);
export type Locale = z.infer<typeof Locale>;
export const LOCALES = Locale.options;

/** Bilingual content. `hi: null` → UI shows English (+ notice where the spec says). */
export const I18nText = z.object({ en: z.string(), hi: z.string().nullable() });
export type I18nText = z.infer<typeof I18nText>;

/** 'YYYY-MM-DD', an IST calendar date. */
export const ISODate = z.iso.date();
export type ISODate = z.infer<typeof ISODate>;

/** RFC 3339 with offset; stored UTC, rendered Asia/Kolkata. */
export const ISODateTime = z.iso.datetime({ offset: true });
export type ISODateTime = z.infer<typeof ISODateTime>;

/** 'YYYY-MM' calendar month (IST). */
export const ISOMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export type ISOMonth = z.infer<typeof ISOMonth>;

/** ULID for new tables; legacy numeric ids stringified. */
export const Id = z.string().min(1).max(64);
export type Id = z.infer<typeof Id>;

/** '+91 98•••••52' — raw phones never leave the server except Follow-up reveal. */
export const MaskedPhone = z.string();
export type MaskedPhone = z.infer<typeof MaskedPhone>;

/** Public small-number suppression (<5). */
export const Lt5 = z.object({ lt5: z.literal(true) });
export const PublicCount = z.union([z.number().int().nonnegative(), Lt5]);
export type PublicCount = z.infer<typeof PublicCount>;

/** `value: null` = not reported → UI shows "—", never 0. */
export const Figure = z.object({ value: PublicCount.nullable(), estimate: z.boolean() });
export type Figure = z.infer<typeof Figure>;

export const Geo = z.object({ lat: z.number(), lng: z.number() });
export type Geo = z.infer<typeof Geo>;

/** `width`/`height` are null for legacy images whose size is unknown (see report: proposed contract edit). */
export const Media = z.object({
  url: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alt: I18nText,
});
export type Media = z.infer<typeof Media>;

export const PageMeta = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});
export type PageMeta = z.infer<typeof PageMeta>;

export const Paged = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item), meta: PageMeta });
export type Paged<T> = { data: T[]; meta: PageMeta };

/** Compact reference to an org unit used inside other DTOs. */
export const UnitRef = z.object({ id: Id, slug: z.string(), name: I18nText });
export type UnitRef = z.infer<typeof UnitRef>;
