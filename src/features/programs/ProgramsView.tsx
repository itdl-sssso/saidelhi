import { useLocale, useTranslations } from "next-intl";
import { type ProgramCard, type Wing } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, tx } from "@/lib/format";
import { LinkTabs, p1 } from "@/features/public/p1";
import { LocalText, PageHero, pub } from "@/features/public/parts";
import { SEVA_ICON } from "@/features/public/seva";
import { Badge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { FigureValue } from "@/ui/Figure";
import { Icon, type IconName, icons } from "@/ui/Icon";
import styles from "./Programs.module.css";

export const WINGS = ["service", "educational", "spiritual"] as const satisfies readonly Wing[];

const iconFor = (c: ProgramCard): IconName => (c.icon in icons ? (c.icon as IconName) : SEVA_ICON[c.sevaType]);

export function ProgramsView({ wing, cards }: { wing: Wing | null; cards: ProgramCard[] }) {
  const t = useTranslations("programs");
  const hrefFor = (w: Wing | null) => (w ? `/programs?wing=${w}` : "/programs");

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbPrograms") }]}>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
        <LinkTabs
          label={t("tabsLabel")}
          items={[
            { id: "all", label: t("tab_all"), href: hrefFor(null), current: wing === null },
            ...WINGS.map((w) => ({ id: w, label: t(`wing_${w}`), href: hrefFor(w), current: wing === w })),
          ]}
        />
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, pub.stack)} style={{ gap: "var(--space-8)" }}>
          {wing ? <WingIntro wing={wing} /> : <ThreeWings />}
          {cards.length ? (
            <ul className={p1.grid3}>
              {cards.map((c) => (
                <li key={c.sevaType}>
                  <Card card={c} />
                </li>
              ))}
            </ul>
          ) : (
            <div className={pub.card}>
              <EmptyState
                icon="hand-heart"
                headingLevel={2}
                title={t("emptyTitle")}
                body={t("emptyBody")}
                action={
                  <Button href="/programs" variant="outline">
                    {t("showAll")}
                  </Button>
                }
              />
            </div>
          )}

          <div className={p1.band}>
            <div>
              <h2 className={pub.h2}>{t("ctaTitle")}</h2>
              <p className={pub.small}>{t("ctaBody")}</p>
            </div>
            <Button href="/join" size="lg" icon="hand-heart">
              {t("ctaButton")}
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Card({ card: c }: { card: ProgramCard }) {
  const t = useTranslations("programs");
  const locale = useLocale() as AppLocale;
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={pub.icwell}>
          <Icon name={iconFor(c)} size={20} />
        </span>
        <Badge tone="prem">{t("wingBadge", { wing: t(`wing_${c.wing}`) })}</Badge>
      </div>
      <h2 className={styles.name}>
        <Link href={c.href} className={styles.link}>
          <LocalText value={c.label} />
        </Link>
      </h2>
      <p className={styles.desc}>{t(`desc.${c.sevaType}`)}</p>
      <dl className={styles.facts}>
        <dt>{t("next")}</dt>
        <dd>
          {c.next ? t("nextValue", { date: formatDayMonth(c.next.startsAt, locale), district: tx(c.next.district.name, locale) }) : <span className={styles.quiet}>{t("notScheduled")}</span>}
        </dd>
        {c.thisYear ? (
          <>
            <dt>{t("thisYear")}</dt>
            <dd>
              <FigureValue value={c.thisYear.figure.value} inline /> <LocalText value={c.thisYear.label} />
            </dd>
          </>
        ) : null}
      </dl>
    </article>
  );
}

function ThreeWings() {
  const t = useTranslations("programs");
  return (
    <div className={styles.intro}>
      <h2 className={pub.h2}>{t("threeWingsTitle")}</h2>
      <p>{t("threeWingsBody")}</p>
    </div>
  );
}

type Block = { kind: "p" | "q"; n: number };
const BLOCKS: Record<Wing, Block[]> = {
  spiritual: [{ kind: "p", n: 1 }, { kind: "p", n: 2 }, { kind: "q", n: 1 }],
  educational: [{ kind: "p", n: 1 }],
  service: [{ kind: "q", n: 1 }, { kind: "q", n: 2 }, { kind: "p", n: 1 }, { kind: "p", n: 2 }, { kind: "q", n: 3 }, { kind: "q", n: 4 }],
};

/** Legacy saidelhi.org wing page wording (docs/content/legacy-wings.md). */
function WingIntro({ wing }: { wing: Wing }) {
  const t = useTranslations("programs");
  const k = (s: string) => `wingIntro.${wing}.${s}` as "wingIntro.service.p1";
  return (
    <div className={styles.intro}>
      <ThreeWings />
      <h2 className={pub.h2}>{t(k("heading"))}</h2>
      {wing === "service" ? <p className={styles.motto}>{t(k("motto"))}</p> : null}
      {BLOCKS[wing].map((b) =>
        b.kind === "p" ? (
          <p key={`p${b.n}`}>{t(k(`p${b.n}`))}</p>
        ) : (
          <blockquote key={`q${b.n}`} className={styles.introQuote}>
            <p>“{t(k(`q${b.n}`))}”</p>
            <footer>{t(k(`c${b.n}`))}</footer>
          </blockquote>
        ),
      )}
      {wing === "service" ? (
        <>
          <h3 className={pub.h3}>{t(k("activitiesTitle"))}</h3>
          <ul className={styles.actList}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <li key={n}>{t(k(`a${n}`))}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
