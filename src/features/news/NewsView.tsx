import { useTranslations } from "next-intl";
import type { Article, ArticleCategoryFilter, Paged } from "@/contract";
import { Link } from "@/i18n/navigation";
import { LinkTabs, ArticleCard, p1 } from "@/features/public/p1";
import { PageHero, pub } from "@/features/public/parts";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Pagination } from "@/ui/Pagination";

const TABS = ["all", "news", "activities", "centenary"] as const;

const hrefFor = (c: ArticleCategoryFilter, page = 1) => {
  const q = new URLSearchParams();
  if (c !== "all") q.set("c", c);
  if (page > 1) q.set("page", String(page));
  const s = q.toString();
  return s ? `/news?${s}` : "/news";
};

export function NewsView({ c, result }: { c: ArticleCategoryFilter; result: Paged<Article> }) {
  const t = useTranslations("news");
  const tc = useTranslations("articleCategory");
  const { data, meta } = result;
  const onTab = (TABS as readonly string[]).includes(c);

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbNews") }]}>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
        <LinkTabs
          label={t("tabsLabel")}
          items={TABS.map((id) => ({
            id,
            label: t(`tab_${id}`),
            href: hrefFor(id),
            current: onTab ? id === c : id === "all",
          }))}
        />
        {!onTab && c !== "all" ? (
          <p className={pub.small}>
            {t("showingCategory", { category: tc(c as Article["category"]) })}{" "}
            <Link href="/news" className={p1.moreLink}>
              {t("showAll")}
            </Link>
          </p>
        ) : null}
      </PageHero>
      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-8)" }}>
          {data.length ? (
            <>
              <ul className={p1.grid3}>
                {data.map((a) => (
                  <li key={a.slug}>
                    <ArticleCard article={a} />
                  </li>
                ))}
              </ul>
              {meta.total > meta.pageSize ? (
                <Pagination page={meta.page} pageSize={meta.pageSize} total={meta.total} href={(p) => hrefFor(c, p)} />
              ) : null}
            </>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="newspaper"
                headingLevel={2}
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                  c !== "all" ? (
                    <Link href="/news" className={p1.moreLink}>
                      {t("showAll")}
                      <Icon name="arrow-right" size={16} />
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
