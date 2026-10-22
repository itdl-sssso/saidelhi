// Server-safe portal building blocks: page head, panel, pills, date chip. Interactive pieces live in their own client files.
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LinkState, Source } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, dateFromIstParts } from "./time";
import { Icon, type IconName } from "@/ui/Icon";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { cx } from "@/ui/cx";
import { FileText, Link2, MessageCircle, ScanLine } from "./icons";
import styles from "./Admin.module.css";

export type Tone = "slate" | "yellow" | "blue" | "pink" | "green" | "alert" | "error";

export function PageHead({
  eyebrow,
  title,
  sub,
  actions,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className={styles.head}>
      <div className={styles.headT}>
        {back ? (
          <Link href={back.href} className={styles.back}>
            <Icon name="arrow-left" size={16} />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.h1}>{title}</h1>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  action,
  badge,
  flush,
  children,
  id,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section className={cx(styles.card, className)} id={id}>
      {title || action ? (
        <header className={styles.cardHd}>
          <h2 className={styles.cardTitle}>
            {title}
            {badge}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={cx(styles.cardBd, flush && styles.cardFlush)}>{children}</div>
    </section>
  );
}

export function Pill({ tone, icon, children }: { tone: Tone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={cx(styles.pill, styles[`t-${tone}`])}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </span>
  );
}

const SOURCE_ICON = { form: FileText, whatsapp: MessageCircle, upload: FileText, scan: ScanLine, portal: Link2 } as const;

export function SourceBadge({ source }: { source: Source }) {
  const t = useTranslations("admin.source");
  return (
    <span className={styles.src}>
      <Icon icon={SOURCE_ICON[source]} size={16} />
      {t(source)}
    </span>
  );
}

/** Calendar chip: day number over short month, IST. */
export function DayChip({ at }: { at: string }) {
  const locale = useLocale() as AppLocale;
  const { d, m } = dateFromIstParts(at, locale);
  return (
    <span className={styles.dchip}>
      <b>{d}</b>
      <span>{m}</span>
    </span>
  );
}

const LINK_TONE = { active: "blue", expired: "slate", revoked: "error", used_up: "green" } as const;
const LINK_ICON = { active: "circle-check", expired: "clock", revoked: "circle-x", used_up: "check" } as const;

export function LinkStatePill({ state }: { state: LinkState }) {
  const t = useTranslations("admin.links.state");
  return (
    <Pill tone={LINK_TONE[state]} icon={LINK_ICON[state]}>
      {t(state)}
    </Pill>
  );
}

/** "1 / 1" or "14 / ∞". */
export const usesText = (uses: number, max: number | null) => `${uses} / ${max ?? "∞"}`;

export function NoAccess() {
  const t = useTranslations("admin.noAccess");
  return (
    <div className={styles.denied}>
      <EmptyState
        icon="lock"
        headingLevel={2}
        title={t("title")}
        body={t("body")}
        action={
          <Button href="/admin" variant="outline">
            {t("toOverview")}
          </Button>
        }
      />
    </div>
  );
}
