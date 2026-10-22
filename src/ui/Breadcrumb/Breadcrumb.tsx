import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "../Icon";
import styles from "./Breadcrumb.module.css";

export type Crumb = { label: ReactNode; href?: string };

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  const t = useTranslations("common");
  return (
    <nav aria-label={t("breadcrumb")} className={className}>
      <ol className={styles.list}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className={styles.item}>
              {i > 0 ? <Icon name="chevron-right" size={16} /> : null}
              {c.href && !last ? (
                <Link href={c.href} className={styles.link}>
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
