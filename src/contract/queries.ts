// Query/body schemas for public endpoints. Query schemas accept the raw string
// values of URLSearchParams (empty strings are treated as absent).
import { z } from "zod";
import { ArticleCategoryFilter, ImpactPeriod, PrivacyRequestType, SevaType } from "./enums";
import { ISODate, Locale } from "./primitives";

const blankToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const opt = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug").max(80);
const QueryBool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");

export const Pagination = z.object({
  page: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(25)),
});
export type Pagination = z.infer<typeof Pagination>;

export const EventsQuery = Pagination.extend({
  from: opt(ISODate),
  to: opt(ISODate),
  district: opt(Slug),
  sevaType: opt(SevaType),
  samithi: opt(Slug),
  needsVolunteers: opt(QueryBool),
});
export type EventsQuery = z.infer<typeof EventsQuery>;

export const CentresQuery = z.object({
  q: opt(z.string().trim().max(80)),
  district: opt(Slug),
  page: Pagination.shape.page,
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(100)),
});
export type CentresQuery = z.infer<typeof CentresQuery>;

export const ImpactQuery = z.object({
  period: z.preprocess(blankToUndefined, ImpactPeriod.default("this_year")),
  district: opt(Slug),
});
export type ImpactQuery = z.infer<typeof ImpactQuery>;

export const ArticlesQuery = z.object({
  c: z.preprocess(blankToUndefined, ArticleCategoryFilter.default("all")),
  page: Pagination.shape.page,
  pageSize: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(12)),
});
export type ArticlesQuery = z.infer<typeof ArticlesQuery>;

export const SlugParams = z.object({ slug: Slug });
export const IdParams = z.object({ id: z.string().min(1).max(64) });

/** Indian mobile or landline, digits with optional +, spaces, dashes. */
export const PhoneInput = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{7,16}[0-9]$/, "Enter a valid phone number");

/** POST /privacy/requests */
export const PrivacyRequestInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: PhoneInput,
  type: PrivacyRequestType,
  details: z.string().trim().max(2000).default(""),
  locale: Locale.optional(),
  /** Honeypot: real users leave it empty. */
  website: z.string().max(200).optional(),
});
export type PrivacyRequestInput = z.input<typeof PrivacyRequestInput>;
export type PrivacyRequestParsed = z.output<typeof PrivacyRequestInput>;
