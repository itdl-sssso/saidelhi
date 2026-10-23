"use client";

// Runs a portal mutation and reacts per CONTRACT §6: 401 → login, 409 → reload prompt,
// 403/423/429/503/network → toast; 422 and success are returned to the caller.
import "./dev-fixtures-load"; // TEMP M6 until backend merge
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { ApiErrorBody } from "@/contract";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/lib/format";
import { type ApiResult, portalRequest } from "@/lib/portal-api";
import { useToast } from "@/ui/Toast";

export interface RunOptions {
  /** Identifies the control that is busy (`pending === key`). */
  key?: string;
  success?: string;
  /** Re-render server data after success (default true). */
  refresh?: boolean;
  /** Skip the toast for 422 so the caller can show field errors. */
  quiet422?: boolean;
  /** Client-fetched pages: what the 409 "Reload" button does (default: router.refresh). */
  onReload?: () => void;
}

export function useAction() {
  const t = useTranslations("admin.errors");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async <T,>(url: string, init: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown } = {}, opts: RunOptions = {}): Promise<ApiResult<T>> => {
      setPending(opts.key ?? "*");
      const res = await portalRequest<T>(url, { method: init.method ?? "POST", body: init.body ?? {}, locale });
      setPending(null);
      if (res.ok) {
        if (opts.success) toast.show({ tone: "success", message: opts.success });
        if (opts.refresh !== false) router.refresh();
        return res;
      }
      const e = res.error;
      if (res.status === 401) {
        router.push({ pathname: "/admin/login", query: { next: pathname } });
      } else if (res.status === 409) {
        toast.show({ tone: "error", message: t("conflict"), action: { label: t("reload"), onClick: () => (opts.onReload ?? router.refresh)() } });
      } else if (res.status === 0) {
        toast.show({ tone: "offline", message: t("network") });
      } else if (res.status === 422) {
        if (!opts.quiet422) toast.show({ tone: "error", message: firstField(e) ?? e.message });
      } else if (res.status === 403) {
        toast.show({ tone: "error", message: t("forbidden") });
      } else if (res.status === 423 || res.status === 429) {
        toast.show({ tone: "error", message: t("tooMany", { seconds: e.retryAfter ?? 60 }) });
      } else if (res.status === 503) {
        toast.show({ tone: "error", message: t("provider") });
      } else {
        toast.show({ tone: "error", message: res.status >= 500 ? t("server") : e.message });
      }
      return res;
    },
    [locale, pathname, router, t, toast],
  );

  return { run, pending };
}

function firstField(e: ApiErrorBody): string | undefined {
  const f = e.fields ? Object.values(e.fields)[0] : undefined;
  return f;
}
