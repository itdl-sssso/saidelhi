import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { GalleryAlbum, GalleryKind, GalleryPage } from "@/contract";
import { Link } from "@/i18n/navigation";
import { LinkTabs, p1 } from "@/features/public/p1";
import { LocalText, PageHero, pub } from "@/features/public/parts";
import { type AppLocale, formatDate, pickText, tx } from "@/lib/format";
import { Badge, type BadgeTone } from "@/ui/Badge";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Pagination } from "@/ui/Pagination";
import styles from "./Gallery.module.css";

export const KIND_TONE: Record<GalleryKind, BadgeTone> = { album: "prem", news: "shanti", event: "prem", centre: "sathya", highlights: "sathya" };

export function galleryHref(f: { year?: number; kind?: GalleryKind; page?: number }) {
  const q = new URLSearchParams();
  if (f.year) q.set("year", String(f.year));
  if (f.kind) q.set("kind", f.kind);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `/gallery?${s}` : "/gallery";
}

export function GalleryView({ result, year, kind }: { result: GalleryPage; year?: number; kind?: GalleryKind }) {
  const t = useTranslations("gallery");
  const { data, meta, facets } = result;
  const filtered = Boolean(year || kind);
  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbGallery") }]}>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
        <div className={styles.filters}>
          {facets.kinds.length > 1 || kind ? (
            <>
              <p className={styles.filterLabel} id="gallery-kind">
                {t("filterKind")}
              </p>
              <LinkTabs
                label={t("filterKind")}
                items={[
                  { id: "all", label: t("all"), href: galleryHref({ year }), current: !kind },
                  ...facets.kinds.map((k) => ({ id: k.kind, label: t(`kind_${k.kind}`), href: galleryHref({ year, kind: k.kind }), current: kind === k.kind })),
                ]}
              />
            </>
          ) : null}
          {facets.years.length > 1 || year ? (
            <>
              <p className={styles.filterLabel} id="gallery-year">
                {t("filterYear")}
              </p>
              <LinkTabs
                label={t("filterYear")}
                items={[
                  { id: "all", label: t("allYears"), href: galleryHref({ kind }), current: !year },
                  ...facets.years.map((y) => ({ id: String(y), label: String(y), href: galleryHref({ year: y, kind }), current: year === y })),
                ]}
              />
            </>
          ) : null}
        </div>
      </PageHero>
      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-8)" }}>
          {data.length ? (
            <>
              <ul className={p1.grid3}>
                {data.map((a) => (
                  <li key={a.slug}>
                    <AlbumCard album={a} />
                  </li>
                ))}
              </ul>
              {meta.total > meta.pageSize ? <Pagination page={meta.page} pageSize={meta.pageSize} total={meta.total} href={(n) => galleryHref({ year, kind, page: n })} /> : null}
            </>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="image"
                headingLevel={2}
                title={t("emptyTitle")}
                body={filtered ? t("emptyFiltered") : t("emptyBody")}
                action={
                  filtered ? (
                    <Link href="/gallery" className={p1.moreLink}>
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

function AlbumCard({ album }: { album: GalleryAlbum }) {
  const t = useTranslations("gallery");
  const locale = useLocale() as AppLocale;
  const title = pickText(album.title, locale);
  return (
    <Link href={`/gallery/${album.slug}`} className={p1.acard}>
      <span className={styles.cover}>
        <Image src={album.cover.src} alt={tx(album.cover.alt, locale)} fill sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw" />
      </span>
      <span className={p1.acardBody}>
        <span className={p1.acardMeta}>
          <Badge tone={KIND_TONE[album.kind]}>{t(`kind_${album.kind}`)}</Badge>
          <time dateTime={album.date}>{formatDate(album.date, locale)}</time>
        </span>
        <LocalText value={album.title} className={p1.acardTitle} />
        {locale === "hi" && title.fallback ? <span className={p1.acardMeta}>{t("availableEnglish")}</span> : null}
        <span className={styles.cardFoot}>
          <Icon name="image" size={16} />
          {t("photosN", { count: album.count })}
        </span>
      </span>
    </Link>
  );
}
