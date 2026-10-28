import Image from "next/image";
import { Fragment } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ArticleDetail, ArticleRef } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDate, pickText, tx } from "@/lib/format";
import { ArticleCard, EnglishOnlyBar, articleTypeName, categoryTone, p1 } from "@/features/public/p1";
import { LocalText, PageHero, SectionHead, pub } from "@/features/public/parts";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { FigureValue } from "@/ui/Figure";
import { Icon } from "@/ui/Icon";
import styles from "./ArticleView.module.css";

export function ArticleView({ article }: { article: ArticleDetail }) {
  const t = useTranslations("news");
  const tc = useTranslations("articleCategory");
  const locale = useLocale() as AppLocale;
  const title = pickText(article.title, locale);
  // The server sanitises `bodyHtml`; the Hindi body is optional and falls back to English.
  const body = pickText(article.bodyHtml, locale);
  const englishOnly = locale === "hi" && (body.fallback || title.fallback);
  // Editor-inserted results card: <div data-event-results="…"></div> (CONTRACT §6). Rendered in place; the aside is then skipped.
  const bodyParts = body.text.split(/<div[^>]*data-event-results[^>]*>\s*<\/div>/i);
  const inlineCard = bodyParts.length > 1 && !!article.event;
  const tiles = article.event?.results?.tiles.filter((x) => x.figure.value !== null).slice(0, 3) ?? [];

  return (
    <>
      {englishOnly ? <EnglishOnlyBar text={t("articleEnglishOnly")} /> : null}
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbNews"), href: "/news" },
          { label: title.text },
        ]}
      >
        <div className={styles.head}>
          <div className={pub.row}>
            <Badge tone={categoryTone(article.category)}>{articleTypeName(article, locale, tc)}</Badge>
            {article.district ? (
              <Link href={`/districts/${article.district.slug}`} className={styles.districtLink}>
                <Icon name="map-pin" size={16} />
                <LocalText value={article.district.name} />
              </Link>
            ) : null}
            <time className={pub.cap} dateTime={article.publishedAt}>
              {formatDate(article.publishedAt, locale)}
            </time>
            <span className={cx(pub.cap, styles.readTime)}>
              <Icon name="clock" size={16} />
              {t("readingMinutes", { count: article.readingMinutes })}
            </span>
          </div>
          <h1 className={pub.h1} lang={title.fallback ? "en" : undefined}>
            {title.text}
          </h1>
          <LocalText value={article.summary} as="p" className={pub.lead} />
        </div>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          <div className={styles.layout}>
            <div className={styles.main}>
              {article.cover ? (
                <figure className={styles.cover}>
                  <Image
                    src={article.cover.url}
                    alt={tx(article.cover.alt, locale)}
                    width={article.cover.width ?? 1200}
                    height={article.cover.height ?? 750}
                    sizes="(min-width: 1000px) 60vw, 100vw"
                    priority
                  />
                </figure>
              ) : null}
              {bodyParts.map((html, i) => (
                <Fragment key={i}>
                  {i > 0 && article.event ? <ResultsCard article={article} tiles={tiles} inline /> : null}
                  {html.trim() ? (
                    <div
                      className={styles.prose}
                      lang={body.fallback ? "en" : undefined}
                      // Sanitised on the server (CONTRACT §6); legacy inline styles are stripped there.
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  ) : null}
                </Fragment>
              ))}
              {article.gallery.length ? (
                <div className={pub.photos}>
                  {article.gallery.map((p) => (
                    <figure key={p.url} className={pub.photo}>
                      <Image src={p.url} alt={tx(p.alt, locale)} fill sizes="(min-width: 768px) 25vw, 50vw" />
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
            {article.event && !inlineCard ? (
              <aside className={styles.aside}>
                <ResultsCard article={article} tiles={tiles} />
              </aside>
            ) : null}
          </div>

          {article.prev || article.next ? (
            <nav className={styles.pager} aria-label={t("prevNext")}>
              {article.prev ? <PagerLink ref_={article.prev} dir="prev" /> : <span />}
              {article.next ? <PagerLink ref_={article.next} dir="next" /> : <span />}
            </nav>
          ) : null}

          {article.related.length ? (
            <div>
              <SectionHead title={t("relatedHeading")} />
              <ul className={p1.grid3}>
                {article.related.slice(0, 3).map((a) => (
                  <li key={a.slug}>
                    <ArticleCard article={a} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={p1.band}>
            <div>
              <h2 className={pub.h3}>{t("calendarCtaTitle")}</h2>
              <p className={pub.small}>{t("calendarCtaBody")}</p>
            </div>
            <Button href="/calendar" icon="calendar-days" iconAfter="arrow-right">
              {t("seeCalendar")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function PagerLink({ ref_, dir }: { ref_: ArticleRef; dir: "prev" | "next" }) {
  const t = useTranslations("news");
  return (
    <Link href={`/news/${ref_.slug}`} className={cx(styles.pagerLink, dir === "next" && styles.pagerNext)} rel={dir}>
      <span className={styles.pagerDir}>
        {dir === "prev" ? <Icon name="arrow-left" size={16} /> : null}
        {dir === "prev" ? t("older") : t("newer")}
        {dir === "next" ? <Icon name="arrow-right" size={16} /> : null}
      </span>
      <LocalText value={ref_.title} className={styles.pagerTitle} />
    </Link>
  );
}

function ResultsCard({ article, tiles, inline }: { article: ArticleDetail; tiles: NonNullable<ArticleDetail["event"]>["results"] extends infer R ? (R extends { tiles: infer T } ? T : never) : never; inline?: boolean }) {
  const t = useTranslations("news");
  if (!article.event) return null;
  return (
    <div className={inline ? styles.results + " " + styles.resultsInline : styles.results}>
      <span className={styles.eb}>{t("fromEvent")}</span>
      <h2 className={styles.resultsTitle}>
        <LocalText value={article.event.title} />
      </h2>
      {tiles.length ? (
        <dl className={styles.tiles}>
          {tiles.map((x) => (
            <div key={x.key}>
              <dt>
                <LocalText value={x.label} />
              </dt>
              <dd>
                <FigureValue value={x.figure.value} inline />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <Link href={`/events/${article.event.id}`} className={p1.moreLink}>
        {t("seeEvent")}
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  );
}
