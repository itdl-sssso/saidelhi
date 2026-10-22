import { z } from "zod";
import { PageMeta } from "./primitives";

export const ErrorCode = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "PHONE_NOT_LISTED",
  "NOT_FOUND",
  "CONFLICT",
  "LINK_EXPIRED",
  "LINK_REVOKED",
  "LINK_USED_UP",
  "VALIDATION_FAILED",
  "LOCKED",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  PHONE_NOT_LISTED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LINK_EXPIRED: 410,
  LINK_REVOKED: 410,
  LINK_USED_UP: 410,
  VALIDATION_FAILED: 422,
  LOCKED: 423,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export const ApiErrorBody = z.object({
  code: ErrorCode,
  message: z.string(),
  fields: z.record(z.string(), z.string()).optional(),
  retryAfter: z.number().int().nonnegative().optional(),
  /** Code-specific data, e.g. 410 link errors carry `{ link: LinkInfo }` (see LinkGoneDetails). */
  details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export const ErrorEnvelope = z.object({ error: ApiErrorBody });
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

export const DataEnvelope = <T extends z.ZodType>(data: T) => z.object({ data });
export type DataEnvelope<T> = { data: T };

export const ListEnvelope = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), meta: PageMeta });
export type ListEnvelope<T> = { data: T[]; meta: PageMeta };

export type ApiResponse<T> = DataEnvelope<T> | ErrorEnvelope;
export type ApiListResponse<T> = ListEnvelope<T> | ErrorEnvelope;

export const isErrorEnvelope = (v: unknown): v is ErrorEnvelope =>
  typeof v === "object" && v !== null && "error" in v;
