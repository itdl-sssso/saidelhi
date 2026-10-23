import { useLocale, useTranslations } from "next-intl";
import type { DiscourseDetail } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, pickText, tx } from "@/lib/format";
import { PageHero, SectionHead, pub } from "@/features/public/parts";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/Icon";
import { QuoteCard } from "@/ui/QuoteCard";
import { DiscourseCardView, ThemeBadges } from "./DiscoursesView";
import { ShareQuote } from "./ShareQuote";
import styles from "./Discourses.module.css";

export type ReadLang = "en" | "hi" | "both";

function Prose({ d, lang, numbered }: { d: DiscourseDetail; lang: AppLocale; numbered?: boolean }) {
  const t = useTranslations("discourses");
  const nums = new Map<string, number>();
  d.blocks.filter((b) => b.type === "para").forEach((b, i) => nums.set(b.id, i + 1));
  return (
    <div className={styles.prose} lang={lang}>
      {d.blocks.map((b) => {
        // Hindi is approved for every published block; fall back to English quietly if one is missing.
        const hi = lang === "hi" && b.hi && b.hi.trim() ? b.hi : null;
        const text = lang === "hi" ? (hi ?? b.en) : b.en;
        const other = lang === "hi" && !hi ? "en" : undefined;
        if (b.type === "heading") {
          return (
            <h2 key={b.id} id={`${b.id}-${lang}`} className={styles.proseHd} lang={other}>
              {text}
            </h2>
          );
        }
        if (b.type === "poem") {
          return (
            <blockquote key={b.id} id={`${b.id}-${lang}`} className={styles.poem} lang={other} aria-label={t("poemNote")}>
              {text}
            </blockquote>
          );
        }
        if (b.type === "quote") {
          return (
            <blockquote key={b.id} id={`${b.id}-${lang}`} className={styles.pullq} lang={other}>
              {text}
            </blockquote>
          );
        }
        const n = nums.get(b.id) ?? 0;
        return (
          <p key={b.id} id={`${b.id}-${lang}`} className={styles.para} lang={other}>
            {numbered ? <span className="sr-only">{t("paragraph", { n })}. </span> : null}
            {text}
          </p>
        );
      })}
    </div>
  );
}

export function DiscourseView({ d, read }: { d: DiscourseDetail; read: ReadLang }) {
  const t = useTranslations("discourses");
  const tv = useTranslations("discourses.valueNames");
  const locale = useLocale() as AppLocale;
  const title = pickText(d.title, locale);
  const credit = tx(d.credit, locale);
  const proseLang: AppLocale = read === "both" ? locale : read;
  const words = d.blocks.reduce((s, b) => s + (proseLang === "hi" && b.hi ? b.hi : b.en).split(/\s+/).length, 0);
  const minutes = Math.max(1, Math.round(words / (proseLang === "hi" ? 180 : 220)));
  const sourceLine = `${d.source.coll} · ${d.date}`;
  const reviewed = d.translation.reviewedBy ? tx(d.translation.reviewedBy, locale) : null;

  const langHref = (l: ReadLang) => (l === locale ? `/discourses/${d.slug}` : `/discourses/${d.slug}?lang=${l}`);
  const options: { id: ReadLang; label: string; lang?: string; both?: boolean }[] = [
    { id: "en", label: t("langEn"), lang: "en" },
    { id: "hi", label: t("langHi"), lang: "hi" },
    { id: "both", label: t("langBoth"), both: true },
  ];

  return (
    <>
      <PageHero
        crumbs={[
          { label: t("crumbHome"), href: "/" },
          { label: t("crumbList"), href: "/discourses" },
          { label: title.text },
        ]}
      >
        <div className={styles.head}>
          <span className={pub.cap}>
            {d.date} · {d.place}
            {d.occasion ? ` · ${d.occasion}` : ""}
          </span>
          <h1 className={pub.h1} lang={title.fallback ? "en" : undefined}>
            {title.text}
          </h1>
          <div className={pub.row}>
            <ThemeBadges themes={d.themes} />
          </div>
          <span className={styles.metaLine}>
            <Icon name="library" size={16} />
            {t("source", { coll: d.source.coll })}
            {d.source.url ? (
              <a href={d.source.url} target="_blank" rel="noreferrer noopener">
                {t("sourceLink")}
              </a>
            ) : null}
            {d.source.pdf ? (
              <a href={d.source.pdf} target="_blank" rel="noreferrer noopener">
                {t("pdfLink")}
              </a>
            ) : null}
          </span>
          <div className={pub.row} style={{ gap: "var(--space-3)" }}>
            <nav aria-label={t("langLabel")}>
              <div className={styles.seg}>
                {options.map((o) => (
                  <Link
                    key={o.id}
                    href={langHref(o.id)}
                    lang={o.lang}
                    aria-current={read === o.id ? "true" : undefined}
                    className={o.both ? styles.segBoth : undefined}
                    scroll={false}
                    replace
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
            </nav>
            <span className={pub.cap}>{t("readingMinutes", { count: minutes })}</span>
          </div>
        </div>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={pub.wrap}>
          {read === "both" ? (
            <div className={cx(styles.reader, styles.readerSide)}>
              <div className={styles.col}>
                <span className={styles.colHd} lang="en">
                  {t("englishCol")}
                </span>
                <Prose d={d} lang="en" numbered />
              </div>
              <div className={styles.col}>
                <span className={styles.colHd} lang="hi">
                  {t("hindiCol")}
                </span>
                <Prose d={d} lang="hi" numbered />
              </div>
            </div>
          ) : (
            <Prose d={d} lang={proseLang} />
          )}
        </div>
      </section>

      {d.quotes.length ? (
        <section className={cx(pub.section, pub.sectionCalm)} aria-labelledby="dq-title">
          <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-6)" }}>
            <SectionHead id="dq-title" title={t("quotesTitle")} sub={t("quotesSub")} />
            <ul className={cx(styles.quoteList, d.quotes.length > 2 && styles.three)}>
              {d.quotes.map((q, i) => {
                const useHi = locale === "hi" && !!q.hi;
                return (
                  <li key={i} className={styles.quoteItem}>
                    <QuoteCard
                      label={t("fromThis")}
                      quote={<span lang={useHi ? "hi" : "en"}>{useHi ? q.hi : q.en}</span>}
                      attribution={t("attribution")}
                    />
                    <ShareQuote en={q.en} hi={q.hi} source={sourceLine} slug={d.slug} index={i} />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={pub.section}>
        <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-10)" }}>
          <div className={styles.tnote}>
            <Icon name="languages" size={20} />
            <div className={styles.tnoteBody}>
              <b>{t("noteTitle")}</b>
              <p className={pub.small}>{t("noteBody")}</p>
              {reviewed ? <p className={pub.small}>{t("noteReviewed", { group: reviewed })}</p> : null}
              <p className={pub.small}>{credit}</p>
              <div>
                <Button variant="ghost" size="sm" icon="flag" href="/privacy#contact">
                  {t("report")}
                </Button>
              </div>
            </div>
          </div>

          {d.related.length || d.value ? (
            <div className={pub.stack} style={{ gap: "var(--space-5)" }}>
              <SectionHead title={t("readNext")} />
              <ul className={styles.grid}>
                {d.related.map((r) => (
                  <li key={r.slug}>
                    <DiscourseCardView d={{ ...r, occasion: "", why: { en: "", hi: null }, coll: "" }} />
                  </li>
                ))}
                {d.value ? (
                  <li>
                    <Link href={`/values/${d.value}`} className={cx(styles.dcard, styles.vlink)}>
                      <span className={styles.vlinkEb}>{t("valueEyebrow")}</span>
                      <h3 className={styles.dtitle}>{tv(d.value)}</h3>
                      <p className={styles.dwhy}>{t("valueBody")}</p>
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
