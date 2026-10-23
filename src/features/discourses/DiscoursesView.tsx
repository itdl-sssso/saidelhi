import { useLocale, useTranslations } from "next-intl";
import { DISCOURSE_THEMES, type DiscourseCard, type DiscourseTheme, type DiscoursesPayload } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, pickText, tx } from "@/lib/format";
import { LocalText, PageHero, pub } from "@/features/public/parts";
import { Badge } from "@/ui/Badge";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { QuoteCard } from "@/ui/QuoteCard";
import { DiscourseSearch } from "./DiscourseSearch";
import { ShareQuote } from "./ShareQuote";
import styles from "./Discourses.module.css";

export const hrefFor = (theme?: DiscourseTheme, q?: string) => {
  const p = new URLSearchParams();
  if (theme) p.set("theme", theme);
  if (q) p.set("q", q);
  const s = p.toString();
  return s ? `/discourses?${s}` : "/discourses";
};

export function ThemeBadges({ themes }: { themes: DiscourseTheme[] }) {
  const locale = useLocale() as AppLocale;
  return (
    <>
      {themes.map((k) => (
        <Badge key={k} tone="shanti">
          {tx(DISCOURSE_THEMES[k].label, locale)}
        </Badge>
      ))}
    </>
  );
}

export function DiscourseCardView({ d, level = 3 }: { d: DiscourseCard; level?: 2 | 3 }) {
  const t = useTranslations("discourses");
  const locale = useLocale() as AppLocale;
  const title = pickText(d.title, locale);
  const H = `h${level}` as const;
  return (
    <Link href={`/discourses/${d.slug}`} className={styles.dcard}>
      <span className={styles.dmeta}>
        {d.date} · {d.place}
        {d.occasion ? ` · ${d.occasion}` : ""}
      </span>
      <H className={styles.dtitle} lang={title.fallback ? "en" : undefined}>
        {title.text}
      </H>
      {d.why.en ? (
        <p className={styles.dwhy}>
          <b>{t("whyLabel")}</b> <LocalText value={d.why} />
        </p>
      ) : null}
      <span className={styles.dtags}>
        <ThemeBadges themes={d.themes} />
      </span>
    </Link>
  );
}

export function DiscoursesView({ data, theme, q }: { data: DiscoursesPayload; theme?: DiscourseTheme; q: string }) {
  const t = useTranslations("discourses");
  const locale = useLocale() as AppLocale;
  const credit = tx(data.credit, locale);
  const f = data.featured;
  const filtered = Boolean(theme || q);

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbList") }]}>
        <div className={styles.heroGrid}>
          <div className={styles.heroText}>
            <span className={pub.cap}>{t("eyebrow")}</span>
            <h1 className={pub.h1}>{t("title")}</h1>
            <p className={pub.lead}>{t("lead")}</p>
            <p className={styles.credit}>
              <Icon name="book-open" size={16} />
              <span>{credit}</span>
            </p>
          </div>
          {f ? (
            <figure className={styles.feat}>
              <QuoteCard
                label={t("featured")}
                quote={<span lang={locale === "hi" && f.quote.hi ? "hi" : "en"}>{locale === "hi" && f.quote.hi ? f.quote.hi : f.quote.en}</span>}
                attribution={t("attribution")}
              />
              <span className={styles.featSrc}>
                <Link href={`/discourses/${f.discourse.slug}`}>
                  <LocalText value={f.discourse.title} />
                </Link>
              </span>
              <ShareQuote
                en={f.quote.en}
                hi={f.quote.hi}
                source={`${f.discourse.title.en} · ${f.discourse.date}`}
                slug={f.discourse.slug}
                index={0}
              />
            </figure>
          ) : null}
        </div>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-6)" }}>
          <DiscourseSearch q={q} theme={theme} />
          <nav aria-label={t("themesLabel")}>
            <ul className={styles.chips}>
              <li>
                <Link href={hrefFor(undefined, q)} aria-current={!theme ? "true" : undefined} scroll={false}>
                  {t("allThemes")}
                </Link>
              </li>
              {data.themes.map((x) => (
                <li key={x.key}>
                  <Link href={hrefFor(x.key, q)} aria-current={theme === x.key ? "true" : undefined} scroll={false}>
                    {tx(x.label, locale)} <span className={styles.chipCount}>{x.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className={cx(pub.cap, styles.count)} role="status">
            {t("count", { count: data.items.length })}
          </p>
          {data.items.length ? (
            <ul className={styles.grid}>
              {data.items.map((d) => (
                <li key={d.slug}>
                  <DiscourseCardView d={d} />
                </li>
              ))}
            </ul>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="search-x"
                headingLevel={2}
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                  filtered ? (
                    <Link href="/discourses" className={pub.cap}>
                      {t("clear")}
                    </Link>
                  ) : undefined
                }
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
