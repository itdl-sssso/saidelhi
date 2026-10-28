import { useLocale, useTranslations } from "next-intl";
import type { GalleryAlbumDetail } from "@/contract";
import { EnglishOnlyBar } from "@/features/public/p1";
import { PageHero, pub } from "@/features/public/parts";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDate, pickText } from "@/lib/format";
import { Badge } from "@/ui/Badge";
import { cx } from "@/ui/cx";
import { Icon } from "@/ui/Icon";
import { KIND_TONE } from "./GalleryView";
import { type LightboxItem, PhotoGrid } from "./Lightbox";
import styles from "./Gallery.module.css";

export function AlbumView({ album }: { album: GalleryAlbumDetail }) {
  const t = useTranslations("gallery");
  const locale = useLocale() as AppLocale;
  const title = pickText(album.title, locale);
  const items: LightboxItem[] = album.photos.map((p) => {
    const alt = pickText(p.alt, locale);
    const cap = p.caption ? pickText(p.caption, locale) : null;
    return {
      src: p.src,
      width: p.width ?? null,
      height: p.height ?? null,
      alt: alt.text || title.text,
      caption: cap?.text ? cap.text : null,
      enFallback: Boolean(cap?.fallback),
    };
  });
  return (
    <>
      {locale === "hi" && title.fallback ? <EnglishOnlyBar text={t("englishOnly")} /> : null}
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbGallery"), href: "/gallery" }, { label: title.text }]}>
        <div className={styles.head}>
          <h1 className={pub.h1} lang={title.fallback ? "en" : undefined}>
            {title.text}
          </h1>
          <div className={styles.metaRow}>
            <Badge tone={KIND_TONE[album.kind]}>{t(`kind_${album.kind}`)}</Badge>
            <time dateTime={album.date}>{formatDate(album.date, locale)}</time>
            <span>{t("photosN", { count: album.count })}</span>
            {album.href ? (
              <Link href={album.href} className={styles.srcLink}>
                {t(`source_${album.kind}`)}
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : null}
          </div>
        </div>
      </PageHero>
      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)}>
          <PhotoGrid items={items} label={t("photosLabel", { title: title.text })} />
          <p className={styles.removal}>
            {t("removalNote")}{" "}
            <Link href="/privacy">{t("removalLink")}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
