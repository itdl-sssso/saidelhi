import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon, type IconName } from "@/ui/Icon";
import { SectionHeading } from "@/ui/SectionHeading";
import styles from "./ErrorView.module.css";

export type ErrorKind = "notFound" | "moved" | "error";

const COPY = {
  notFound: { code: "404", title: "notFoundTitle", body: "notFoundBody" },
  moved: { code: "404", title: "movedTitle", body: "movedBody" },
  error: { code: "500", title: "errorTitle", body: "errorBody" },
} as const;

const DESTINATIONS: Array<{ href: string; icon: IconName; label: "goHome" | "calendar" | "centres" }> = [
  { href: "/", icon: "house", label: "goHome" },
  { href: "/calendar", icon: "calendar-days", label: "calendar" },
  { href: "/centres/map", icon: "map-pin", label: "centres" },
];

/** Spec 18: recover gracefully with a plain sentence and the three most useful ways forward. */
export function ErrorView({ kind, actions, digest }: { kind: ErrorKind; actions?: ReactNode; digest?: string }) {
  const t = useTranslations("errors");
  const copy = COPY[kind];
  return (
    <section className={styles.section} aria-labelledby="error-title">
      <div className={styles.wrap}>
        <span className={styles.code} aria-hidden="true">
          {copy.code}
        </span>
        <SectionHeading level={1} titleId="error-title" title={t(copy.title)} description={t(copy.body)} />
        {actions ? <div className={styles.actions}>{actions}</div> : null}
        <ul className={styles.links}>
          {DESTINATIONS.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className={styles.link}>
                <Icon name={d.icon} size={20} />
                {t(d.label)}
                <Icon name="arrow-right" size={18} />
              </Link>
            </li>
          ))}
        </ul>
        {digest ? <p className={styles.ref}>{t("reference", { digest })}</p> : null}
      </div>
    </section>
  );
}
