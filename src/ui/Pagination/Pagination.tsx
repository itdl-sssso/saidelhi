import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatCount } from "../data/format";
import { Icon } from "../Icon";
import { cx } from "../cx";
import styles from "./Pagination.module.css";

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the link for a page, e.g. (p) => `/news?page=${p}`. */
  href: (page: number) => string;
  className?: string;
};

function windowed(page: number, count: number): Array<number | "gap"> {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

export function Pagination({ page, pageSize, total, href, className }: PaginationProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const count = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const fmt = (n: number) => formatCount(n, locale);

  return (
    <nav aria-label={t("pagination")} className={cx(styles.root, className)}>
      <span>{t("showing", { from: fmt(from), to: fmt(to), total: fmt(total) })}</span>
      <ul className={styles.pages}>
        <li>
          {page > 1 ? (
            <Link href={href(page - 1)} className={styles.page} rel="prev">
              <Icon name="chevron-left" size={16} />
              <span className={styles.label}>{t("previous")}</span>
            </Link>
          ) : (
            <span className={cx(styles.page, styles.disabled)} aria-disabled="true">
              <Icon name="chevron-left" size={16} />
              <span className={styles.label}>{t("previous")}</span>
            </span>
          )}
        </li>
        {windowed(page, count).map((p, i) =>
          p === "gap" ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                className={styles.page}
                aria-current={p === page ? "page" : undefined}
                aria-label={t("pageN", { page: p })}
              >
                {fmt(p)}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < count ? (
            <Link href={href(page + 1)} className={styles.page} rel="next">
              <span className={styles.label}>{t("next")}</span>
              <Icon name="chevron-right" size={16} />
            </Link>
          ) : (
            <span className={cx(styles.page, styles.disabled)} aria-disabled="true">
              <span className={styles.label}>{t("next")}</span>
              <Icon name="chevron-right" size={16} />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
