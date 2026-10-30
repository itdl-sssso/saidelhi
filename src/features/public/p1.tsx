import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { Article } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDate, pickText, tx } from "@/lib/format";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { Icon } from "@/ui/Icon";
import { LocalText } from "./parts";
import styles from "./p1.module.css";

export { styles as p1 };

type TabLink = { id: string; label: string; href: string; current: boolean };

/** Filter tabs that are plain links (work without JavaScript; state lives in the URL). */
export function LinkTabs({ label, items }: { label: string; items: TabLink[] }) {
  return (
    <nav aria-label={label}>
      <ul className={styles.tabs}>
        {items.map((i) => (
          <li key={i.id}>
            <Link href={i.href} aria-current={i.current ? "page" : undefined} scroll={false}>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Banner above the hero on a Hindi page whose body is English only. */
export function EnglishOnlyBar({ text }: { text: string }) {
  return (
    <div className={styles.enOnly} role="status">
      <Icon name="languages" size={18} />
      <span>{text}</span>
    </div>
  );
}

const CATEGORY_TONE: Record<Article["category"], BadgeTone> = {
  news: "shanti",
  activities: "prem",
  centenary_national: "sathya",
  centenary_state: "sathya",
  key_programs: "prem",
  special_programs: "sathya",
  stories: "prem",
};
/** Admin-managed name of the article's type (falls back to the built-in strings). */
export const articleTypeName = (a: Article, locale: AppLocale, tc: (c: Article["category"]) => string): string => (a.type ? tx(a.type.label, locale) : tc(a.category));
export const categoryTone = (c: Article["category"]) => CATEGORY_TONE[c];

export function ArticleCard({ article }: { article: Article }) {
  const t = useTranslations("news");
  const tc = useTranslations("articleCategory");
  const locale = useLocale() as AppLocale;
  const title = pickText(article.title, locale);
  return (
    <Link href={`/news/${article.slug}`} className={styles.acard}>
      <span className={styles.acardImg}>
        {article.cover ? (
          <Image
            src={article.cover.url}
            alt={tx(article.cover.alt, locale)}
            fill
            sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <span className={styles.acardPh} aria-hidden="true">
            <Icon name="newspaper" size={24} />
          </span>
        )}
      </span>
      <span className={styles.acardBody}>
        <span className={styles.acardMeta}>
          <Badge tone={CATEGORY_TONE[article.category]}>{articleTypeName(article, locale, tc)}</Badge>
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, locale)}</time>
        </span>
        <LocalText value={article.title} className={styles.acardTitle} />
        {locale === "hi" && title.fallback ? (
          <span className={styles.enOnlyChip}>
            <Icon name="languages" size={16} />
            {t("englishOnly")}
          </span>
        ) : null}
        {article.district ? (
          <span className={styles.acardFoot}>
            <Icon name="map-pin" size={16} />
            <LocalText value={article.district.name} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}
