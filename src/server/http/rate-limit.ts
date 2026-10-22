import { ApiError } from "./errors";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window, in-process limiter. Fine for the single-node deployment; swap
 * for a DB/Redis-backed one if the app is ever scaled horizontally.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Throws RATE_LIMITED (with retryAfter seconds) once `key` exceeds the limit. */
  hit(key: string): void {
    const t = this.now();
    if (this.buckets.size > 10_000) this.sweep(t);
    const b = this.buckets.get(key);
    if (!b || b.resetAt <= t) {
      this.buckets.set(key, { count: 1, resetAt: t + this.windowMs });
      return;
    }
    b.count += 1;
    if (b.count > this.limit) {
      throw new ApiError("RATE_LIMITED", { retryAfter: Math.max(1, Math.ceil((b.resetAt - t) / 1000)) });
    }
  }

  private sweep(t: number) {
    for (const [k, b] of this.buckets) if (b.resetAt <= t) this.buckets.delete(k);
  }
}
