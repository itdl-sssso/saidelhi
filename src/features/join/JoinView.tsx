import { useLocale, useTranslations } from "next-intl";
import type { DistrictSummary, JoinEvent, JoinPayload, JoinQuery, SevaType } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatTime, tx } from "@/lib/format";
import { DateChip, LocalText, PageHero, pub } from "@/features/public/parts";
import { Button } from "@/ui/Button";
import { cx } from "@/ui/cx";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { OptInForm } from "./OptInForm";
import { WhatsAppCard } from "./WhatsAppCard";
import styles from "./Join.module.css";

export const JOIN_SEVA_TYPES: SevaType[] = ["eye", "blood", "medical", "narayan_seva", "bal_vikas", "bhajan", "study_circle", "cleanliness", "disaster_relief"];

const query = (q: Pick<JoinQuery, "district" | "sevaType" | "from" | "to">, page: number) => {
  const p = new URLSearchParams();
  if (q.district) p.set("district", q.district);
  if (q.sevaType) p.set("sevaType", q.sevaType);
  if (q.from) p.set("from", q.from);
  if (q.to) p.set("to", q.to);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/join?${s}` : "/join";
};

export function JoinView({ data, q, districts }: { data: JoinPayload; q: JoinQuery; districts: DistrictSummary[] }) {
  const t = useTranslations("join");
  const ts = useTranslations("seva");
  const locale = useLocale() as AppLocale;
  const { events } = data;
  const filtered = Boolean(q.district || q.sevaType || q.from || q.to);
  const districtOptions = districts.map((d) => ({ value: d.district.slug, label: tx(d.district.name, locale) }));

  return (
    <>
      <PageHero crumbs={[{ label: t("crumbHome"), href: "/" }, { label: t("crumbJoin") }]}>
        <h1 className={pub.h1}>{t("title")}</h1>
        <p className={pub.lead}>{t("lead")}</p>
      </PageHero>

      <section className={pub.section} style={{ paddingTop: "var(--space-6)" }}>
        <div className={cx(pub.wrap, styles.layout)}>
          <div className={styles.main}>
            <form method="get" action="/join" className={styles.filters} role="search" aria-label={t("filtersLabel")}>
              <Select name="district" label={t("district")} defaultValue={q.district ?? ""} options={[{ value: "", label: t("all") }, ...districtOptions]} />
              <Select
                name="sevaType"
                label={t("type")}
                defaultValue={q.sevaType ?? ""}
                options={[{ value: "", label: t("all") }, ...JOIN_SEVA_TYPES.map((s) => ({ value: s, label: ts(s) }))]}
              />
              <Input name="from" type="date" label={t("from")} defaultValue={q.from ?? ""} />
              <Input name="to" type="date" label={t("to")} defaultValue={q.to ?? ""} />
              <div className={styles.filterActions}>
                <Button type="submit" variant="secondary" icon="search">
                  {t("apply")}
                </Button>
                {filtered ? (
                  <Button href="/join" variant="quiet">
                    {t("clear")}
                  </Button>
                ) : null}
              </div>
            </form>

            {events.data.length ? (
              <>
                <p className={pub.cap} role="status">
                  {t("count", { count: events.meta.total })}
                </p>
                <ul className={styles.needs}>
                  {events.data.map((e) => (
                    <Need key={e.id} event={e} />
                  ))}
                </ul>
                {events.meta.total > events.meta.pageSize ? (
                  <Pagination page={events.meta.page} pageSize={events.meta.pageSize} total={events.meta.total} href={(p) => query(q, p)} />
                ) : null}
              </>
            ) : (
              <div className={pub.card}>
                <EmptyState
                  icon="hand-heart"
                  headingLevel={2}
                  title={filtered ? t("emptyFilteredTitle") : t("emptyTitle")}
                  body={filtered ? t("emptyFilteredBody") : t("emptyBody")}
                  action={
                    filtered ? (
                      <Button href="/join" variant="outline">
                        {t("clear")}
                      </Button>
                    ) : (
                      <Button href="/calendar" variant="outline" iconAfter="arrow-right">
                        {t("seeCalendar")}
                      </Button>
                    )
                  }
                />
              </div>
            )}
          </div>

          <aside className={styles.side} aria-label={t("sideLabel")}>
            <div className={pub.card}>
              <h2 className={pub.h3}>{t("waTitle")}</h2>
              <p className={pub.small}>{t("waBody", { keyword: data.whatsapp.keyword })}</p>
              <WhatsAppCard contact={data.whatsapp} />
            </div>

            <div className={pub.card}>
              <h2 className={pub.h3}>{t("optinTitle")}</h2>
              <p className={pub.small}>{t("optinBody")}</p>
              <OptInForm districts={districtOptions.map((d, i) => ({ value: districts[i].district.id, label: d.label }))} sevaTypes={JOIN_SEVA_TYPES.map((s) => ({ value: s, label: ts(s) }))} />
            </div>

            <div className={pub.card}>
              <h2 className={pub.h3}>{t("expectTitle")}</h2>
              <ul className={styles.expect}>
                {(
                  [
                    ["clock", "expect1"],
                    ["shirt", "expect2"],
                    ["users", "expect3"],
                    ["gift", "expect4"],
                  ] as const
                ).map(([icon, k]) => (
                  <li key={k}>
                    <Icon name={icon} size={18} />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/privacy" className={pub.more}>
                {t("privacyLink")}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Need({ event: e }: { event: JoinEvent }) {
  const t = useTranslations("join");
  const locale = useLocale() as AppLocale;
  return (
    <li>
      <Link href={`/events/${e.id}`} className={styles.need}>
        <span className={styles.needRow}>
          <DateChip at={e.postponedTo ?? e.startsAt} />
          <span className={pub.col} style={{ gap: 2 }}>
            <LocalText value={e.title} className={pub.evTitle} />
            <span className={pub.cap}>
              <LocalText value={e.district.name} /> · {e.venue.name} · {formatTime(e.postponedTo ?? e.startsAt, locale)}
            </span>
          </span>
          <span className={styles.cta}>
            {t("canCome")}
            <Icon name="arrow-right" size={16} />
          </span>
        </span>
        <span className={styles.needFoot}>
          <span className={pub.volb}>
            <Icon name="hand-heart" size={16} />
            {t("sevadalNeeded")}
          </span>
        </span>
      </Link>
    </li>
  );
}
