"use client";

// Multipart POST for the portal (uploads, photos, sitemap). Same CSRF header and failure envelope as useAction;
// 422 is returned to the caller, everything else toasts. 401 → login.
import "./dev-fixtures-load"; // TEMP M6 until backend merge
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { PORTAL_HEADERS } from "@/contract";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ApiResult } from "@/lib/portal-api";
import { csrfToken } from "@/lib/portal-api";
import { useToast } from "@/ui/Toast";

export function useUpload() {
  const t = useTranslations("admin.errors");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const upload = useCallback(
    async <T,>(url: string, form: FormData, key = "*"): Promise<ApiResult<T>> => {
      setPending(key);
      let res: Response;
      try {
        res = await fetch(url, { method: "POST", body: form, credentials: "same-origin", headers: { accept: "application/json", "accept-language": locale, [PORTAL_HEADERS.csrf]: csrfToken() } });
      } catch {
        setPending(null);
        toast.show({ tone: "offline", message: t("network") });
        return { ok: false, status: 0, error: { code: "INTERNAL", message: "Network error" } };
      }
      setPending(null);
      const json = (await res.json().catch(() => null)) as { data?: T; error?: { code: string; message: string; fields?: Record<string, string> } } | null;
      if (res.ok && json && "data" in json) return { ok: true, status: res.status, data: json.data as T };
      const error = (json?.error ?? { code: "INTERNAL", message: res.statusText }) as ApiResult<T> extends infer R ? (R extends { ok: false; error: infer E } ? E : never) : never;
      if (res.status === 401) router.push({ pathname: "/admin/login", query: { next: pathname } });
      else if (res.status === 403) toast.show({ tone: "error", message: t("forbidden") });
      else if (res.status === 429 || res.status === 423) toast.show({ tone: "error", message: t("tooMany", { seconds: 60 }) });
      else if (res.status >= 500) toast.show({ tone: "error", message: t("server") });
      else if (res.status !== 422) toast.show({ tone: "error", message: error.message });
      return { ok: false, status: res.status, error };
    },
    [locale, pathname, router, t, toast],
  );
  return { upload, pending };
}
