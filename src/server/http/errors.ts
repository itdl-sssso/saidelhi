import { ERROR_HTTP_STATUS, type ErrorCode } from "@/contract";

export interface ApiErrorOptions {
  /** Overrides the localised default message. */
  message?: string;
  fields?: Record<string, string>;
  retryAfter?: number;
  /** Extra machine-readable data, e.g. `{ link: LinkInfo }` on 410 link errors. */
  details?: Record<string, unknown>;
  cause?: unknown;
}

/** Throw from services/handlers; the route wrapper turns it into the §2 error envelope. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly retryAfter?: number;
  readonly customMessage?: string;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, opts: ApiErrorOptions = {}) {
    super(opts.message ?? code, { cause: opts.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    this.fields = opts.fields;
    this.retryAfter = opts.retryAfter;
    this.customMessage = opts.message;
    this.details = opts.details;
  }
}

export const notFound = () => new ApiError("NOT_FOUND");
