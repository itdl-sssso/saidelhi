"use client";

// Client data layer for the discourse workspace (spec 39). Talks to /api/v1/admin/discourses*.
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { type ApiErrorBody, isErrorEnvelope } from "@/contract";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";
import { portalRequest } from "@/lib/portal-api";
import { useToast } from "@/ui/Toast";

export type Result<T> =
  | { ok: true; status: number; data: T; meta?: unknown }
  | { ok: false; status: number; error: ApiErrorBody };

async function get0<T>(url: string, locale: AppLocale): Promise<Result<T>> {
  let status = 0;
  let json: unknown = null;
  try {
    const res = await fetch(url, { headers: { accept: "application/json", "accept-language": locale }, credentials: "same-origin" });
    status = res.status;
    json = await res.json().catch(() => null);
  } catch {
    return { ok: false, status: 0, error: { code: "INTERNAL", message: "Network error" } };
  }
  if (status >= 200 && status < 300 && json && typeof json === "object" && "data" in json) {
    const body = json as { data: T; meta?: unknown };
    return { ok: true, status, data: body.data, meta: body.meta };
  }
  if (isErrorEnvelope(json)) return { ok: false, status, error: json.error };
  return { ok: false, status, error: { code: "INTERNAL", message: "Unexpected response" } };
}

/** GET one JSON endpoint. */
export async function get<T>(url: string, locale: AppLocale): Promise<Result<T>> {
  return get0<T>(url, locale);
}

export type DiscState<T> =
  | { status: "loading"; data: null; meta: null }
  | { status: "ready"; data: T; meta: unknown }
  | { status: "forbidden" | "notFound" | "error"; data: null; meta: null };

export type DiscApi<T> = DiscState<T> & { reload: () => void };

/** Loading/error shell data hook; shaped like `useApi` so `<Loadable>` works. `key` identifies the request. */
export function useDisc<T>(key: string | null, load: (locale: AppLocale) => Promise<Result<T>>): DiscApi<T> {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<DiscState<T>>({ status: "loading", data: null, meta: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    void load(locale).then((res) => {
      if (!live) return;
      if (res.ok) return setState({ status: "ready", data: res.data, meta: res.meta ?? null });
      if (res.status === 401) router.push({ pathname: "/admin/login", query: { next: pathname } });
      else if (res.status === 403) setState({ status: "forbidden", data: null, meta: null });
      else if (res.status === 404) setState({ status: "notFound", data: null, meta: null });
      else setState({ status: "error", data: null, meta: null });
    });
    return () => {
      live = false;
    };
    // `load` is rebuilt every render by callers; `key` carries its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale, tick, router, pathname]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload } as DiscApi<T>;
}

/** Mutation runner with the CONTRACT §6 reactions (401 login, 409 reload prompt, toasts). 422 returned to the caller. */
export function useDiscMutate(onReload: () => void) {
  const t = useTranslations("admin.errors");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(url: string, method: "POST" | "PATCH", body: unknown, opts: { key?: string; quiet?: boolean } = {}): Promise<Result<T>> => {
      setPending(opts.key ?? "*");
      const res = await portalRequest<T>(url, { method, body, locale });
      setPending(null);
      if (res.ok) return res;
      if (opts.quiet && res.status !== 409 && res.status !== 401) return res;
      if (res.status === 401) router.push({ pathname: "/admin/login", query: { next: pathname } });
      else if (res.status === 409) toast.show({ tone: "error", message: t("conflict"), action: { label: t("reload"), onClick: onReload } });
      else if (res.status === 0) toast.show({ tone: "offline", message: t("network") });
      else if (res.status === 403) toast.show({ tone: "error", message: t("forbidden") });
      else if (res.status === 422) toast.show({ tone: "error", message: Object.values(res.error.fields ?? {})[0] ?? res.error.message });
      else if (res.status === 423 || res.status === 429) toast.show({ tone: "error", message: t("tooMany", { seconds: res.error.retryAfter ?? 60 }) });
      else toast.show({ tone: "error", message: res.status >= 500 ? t("server") : res.error.message });
      return res;
    },
    [locale, pathname, router, t, toast, onReload],
  );
  return { run, pending };
}
