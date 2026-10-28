"use client";

// Small shared client pieces for the M6 portal pages: loading shell, tab nav, language status, toggle row, note.
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/ui/EmptyState";
import { Icon, type IconName, icons } from "@/ui/Icon";
import { SkeletonRows } from "@/ui/Skeleton";
import { Switch } from "@/ui/Switch";
import { Pill } from "./kit";
import { ScrollTabs } from "./ScrollTabs";
import type { UseApi } from "./useApi";
import { hrefWith } from "./url";
import styles from "./Admin.module.css";
import p from "./Parts.module.css";

/** Shared loading / error / forbidden shell for a client-fetched block. */
export function Loadable<T, M>({ api, children, rows }: { api: UseApi<T, M>; children: (data: T, meta: M | null) => ReactNode; rows?: number }) {
  const t = useTranslations("admin.common");
  if (api.status === "loading")
    return (
      <div className={styles.card} aria-busy="true">
        <SkeletonRows rows={rows} />
      </div>
    );
  if (api.status === "forbidden") return <EmptyState icon="lock" title={t("forbidden")} />;
  if (api.status === "notFound") return <EmptyState icon="search-x" title={t("notFound")} />;
  if (api.status !== "ready")
    return (
      <EmptyState
        icon="cloud-off"
        title={t("loadError")}
        action={
          <button type="button" className={styles.linkBtn} onClick={api.reload}>
            {t("retry")}
          </button>
        }
      />
    );
  return <>{children(api.data, api.meta)}</>;
}

/** Lucide glyph by design-system name, with a fallback when the stored name is unknown. */
export function SafeIcon({ name, fallback = "file-text", size = 18 }: { name: string; fallback?: IconName; size?: 16 | 18 | 20 | 24 }) {
  return <Icon name={name in icons ? (name as IconName) : fallback} size={size} />;
}

export function IconDot({ name, fallback }: { name: string; fallback?: IconName }) {
  return (
    <span className={p.iconDot}>
      <SafeIcon name={name} fallback={fallback} />
    </span>
  );
}

/** URL-driven pill tabs (`?tab=`), same look as the WhatsApp admin. The first tab is the default (no param). */
export function LinkTabs<T extends string>({ path, tabs, current, label, labels, param = "tab", counts }: { path: string; tabs: readonly T[]; current: T; label: string; labels: Record<T, string>; param?: string; counts?: Partial<Record<T, number>> }) {
  const sp = useSearchParams();
  const params = Object.fromEntries(sp.entries());
  return (
    <ScrollTabs label={label}>
      {tabs.map((id, i) => (
        <Link key={id} href={hrefWith(path, params, { [param]: i === 0 ? null : id, page: null })} className={styles.tab} aria-current={current === id ? "page" : undefined}>
          {labels[id]}
          {counts?.[id] !== undefined ? <span className={styles.tabCount}>{counts[id]}</span> : null}
        </Link>
      ))}
    </ScrollTabs>
  );
}

/** "EN ✓ HI —" completeness. */
export function Lang({ en, hi }: { en: boolean; hi: boolean }) {
  return (
    <span className={p.lang}>
      <span className={en ? p.ok : p.no}>
        EN{en ? <Icon name="check" size={16} /> : " —"}
      </span>
      <span className={hi ? p.ok : p.no}>
        HI{hi ? <Icon name="check" size={16} /> : " —"}
      </span>
    </span>
  );
}

export function Note({ icon = "info", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <span className={p.note}>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </span>
  );
}

/** Switch row with a title and description. `locked` shows a lock pill instead of the switch. */
export function TogRow({ label, desc, checked, onChange, disabled, locked, children }: { label: string; desc?: ReactNode; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; locked?: string; children?: ReactNode }) {
  return (
    <div className={p.tog}>
      <div className={p.togT}>
        <b className={styles.strong}>{label}</b>
        {desc ? <span className={styles.cap}>{desc}</span> : null}
        {children}
      </div>
      {locked ? (
        <Pill tone="slate" icon="lock">
          {locked}
        </Pill>
      ) : (
        <Switch label={<span className={styles.srOnly}>{label}</span>} checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      )}
    </div>
  );
}

/** Footer line under a table ("Codes never change…"). */
export function TableFoot({ icon = "lock", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className={p.tfoot}>
      <Icon name={icon} size={16} />
      {children}
    </div>
  );
}

/** Restricted-data banner (follow-up, privacy). */
export function Restricted({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={p.restr} role="note">
      <Icon name="lock" size={20} />
      <div>
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}
