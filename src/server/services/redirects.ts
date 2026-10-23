import { legacyRedirect, type RedirectTarget } from "@/contract";
import type { DataRepo } from "../repo/types";
import type { RedirectsService } from "./types";

const TTL_MS = 5 * 60 * 1000;

/** Path without query, fragment or trailing slash: the `redirect.from_path` key. */
export function normaliseRedirectPath(raw: string): string {
  const path = raw.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return path.startsWith("/") ? path : `/${path}`;
}

export function createRedirectsService(repo: DataRepo, now: () => Date): RedirectsService {
  // Table rows rarely change: cache hits and misses for five minutes.
  const cache = new Map<string, { until: number; target: RedirectTarget | null }>();

  return {
    async resolve(rawPath: string): Promise<RedirectTarget | null> {
      const path = normaliseRedirectPath(rawPath);
      if (path.length > 500) return null;
      const t = now().getTime();
      let hit = cache.get(path);
      if (!hit || hit.until <= t) {
        const row = await repo.redirectByPath(path);
        hit = { until: t + TTL_MS, target: row ? { to: row.toPath, permanent: row.permanent } : null };
        if (cache.size > 2000) cache.clear();
        cache.set(path, hit);
      }
      if (hit.target) {
        void repo.redirectHit(path).catch(() => {});
        return hit.target;
      }
      return legacyRedirect(path);
    },
  };
}
