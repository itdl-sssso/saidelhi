"use client";

// URL-driven filters: every control writes its value to the query string (page resets to 1),
// active filters show as removable chips.
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Icon } from "@/ui/Icon";
import { Button } from "@/ui/Button";
import styles from "./Admin.module.css";

export type FilterField =
  | { kind: "select"; key: string; label: string; options: Array<{ value: string; label: string }> }
  | { kind: "date"; key: string; label: string }
  | { kind: "search"; key: string; label: string };

export function FilterBar({ fields }: { fields: FilterField[] }) {
  const t = useTranslations("admin.common");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, sp],
  );

  const active = fields
    .map((f) => {
      const v = sp.get(f.key);
      if (!v) return null;
      const shown = f.kind === "select" ? (f.options.find((o) => o.value === v)?.label ?? v) : v;
      return { key: f.key, text: `${f.label}: ${shown}` };
    })
    .filter((x) => !!x);

  return (
    <div className={styles.stack} style={{ gap: 10 }}>
      <div className={styles.filters}>
        {fields.map((f) =>
          f.kind === "select" ? (
            <select key={f.key} className={styles.nativeSel} aria-label={f.label} value={sp.get(f.key) ?? ""} onChange={(e) => set({ [f.key]: e.target.value || null })}>
              <option value="">{f.label}: {t("all")}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.kind === "date" ? (
            <label key={f.key} className={styles.row} style={{ gap: 6 }}>
              <span className={styles.cap}>{f.label}</span>
              <input type="date" className={styles.nativeSel} value={sp.get(f.key) ?? ""} onChange={(e) => set({ [f.key]: e.target.value || null })} />
            </label>
          ) : (
            <label key={f.key} className={styles.row} style={{ gap: 6 }}>
              <span className={styles.srOnly}>{f.label}</span>
              <input
                type="search"
                className={styles.nativeSel}
                placeholder={f.label}
                defaultValue={sp.get(f.key) ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") set({ [f.key]: e.currentTarget.value.trim() || null });
                }}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v !== (sp.get(f.key) ?? "")) set({ [f.key]: v || null });
                }}
              />
            </label>
          ),
        )}
      </div>
      {active.length ? (
        <div className={styles.filters}>
          {active.map((a) => (
            <span key={a.key} className={styles.chip}>
              {a.text}
              <button type="button" aria-label={`${t("removeFilter")}: ${a.text}`} onClick={() => set({ [a.key]: null })}>
                <Icon name="x" size={16} />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="sm" onClick={() => set(Object.fromEntries(active.map((a) => [a.key, null])))}>
            {t("clearAll")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
