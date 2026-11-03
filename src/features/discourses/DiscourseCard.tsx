import { useLocale, useTranslations } from "next-intl";
import { DISCOURSE_THEMES, type DiscourseCard, type DiscourseTheme } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, pickText, tx } from "@/lib/format";
import { LocalText } from "@/features/public/parts";
import { Badge } from "@/ui/Badge";
import styles from "./Discourses.module.css";

/** Discourse list card and its theme badges (discourses list, discourse page, home). */
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
