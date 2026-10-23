"use client";

// Client read for portal pages whose data comes straight from /api/v1 (CONTRACT §2): loading, error,
// reload, and the `meta` of list envelopes (src/lib/api.ts drops it). 401 → login.
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";

export type ApiState<T, M> =
  | { status: "loading"; data: null; meta: null }
  | { status: "ready"; data: T; meta: M | null }
  | { status: "forbidden"; data: null; meta: null }
  | { status: "notFound"; data: null; meta: null }
  | { status: "error"; data: null; meta: null };

export type UseApi<T, M> = ApiState<T, M> & { reload: () => void };

export function useApi<T, M = undefined>(url: string | null): UseApi<T, M> {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ApiState<T, M>>({ status: "loading", data: null, meta: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    let live = true;
    (async () => {
      let status = 0;
      let json: unknown = null;
      try {
        const res = await fetch(url, { headers: { accept: "application/json", "accept-language": locale }, credentials: "same-origin" });
        status = res.status;
        json = await res.json().catch(() => null);
      } catch {
        status = 0;
      }
      if (!live) return;
      if (status >= 200 && status < 300 && json && typeof json === "object" && "data" in json) {
        const body = json as { data: T; meta?: M };
        return setState({ status: "ready", data: body.data, meta: body.meta ?? null });
      }
      if (status === 401) router.push({ pathname: "/admin/login", query: { next: pathname } });
      else if (status === 403) setState({ status: "forbidden", data: null, meta: null });
      else if (status === 404) setState({ status: "notFound", data: null, meta: null });
      else setState({ status: "error", data: null, meta: null });
    })();
    return () => {
      live = false;
    };
  }, [url, locale, tick, router, pathname]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload } as UseApi<T, M>;
}
