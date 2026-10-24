import { getTranslations } from "next-intl/server";
import type { AdminLinksQuery, FormLinkAdmin } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Pagination } from "@/ui/Pagination";
import { FilterBar, type FilterField } from "../FilterBar";
import { LinkStatePill, PageHead, usesText } from "../kit";
import type { OrgOptions } from "../server";
import { fmtShortDateTime } from "../time";
import { hrefWith, type Params } from "../url";
import { LinkActions } from "./LinkActions";
import styles from "../Admin.module.css";

export async function LinksPage({
  locale,
  rows,
  total,
  expiringSoon,
  query,
  sp,
  org,
  canManage,
}: {
  locale: AppLocale;
  rows: FormLinkAdmin[];
  total: number;
  expiringSoon: number;
  query: AdminLinksQuery;
  sp: Params;
  org: OrgOptions;
  canManage: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "admin.links" });
  const path = "/admin/links";
  const fields: FilterField[] = [
    { kind: "select", key: "state", label: t("fState"), options: [{ value: "active", label: t("state.active") }, { value: "expiring", label: t("expiring") }, { value: "expired", label: t("state.expired") }, { value: "revoked", label: t("state.revoked") }, { value: "used_up", label: t("state.used_up") }] },
    { kind: "select", key: "purpose", label: t("fPurpose"), options: [{ value: "report", label: t("purpose.report") }, { value: "desk", label: t("purpose.desk") }, { value: "public", label: t("purpose.public") }] },
    ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "district", label: t("fDistrict"), options: org.districts }] : []),
  ];
  const filtered = ["state", "purpose", "district", "event"].some((k) => sp[k]);
  const sentTo = (l: FormLinkAdmin) => (l.sentTo === "qr" ? t("qrPoster") : (l.sentTo ?? t("notSent")));

  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      {expiringSoon > 0 && query.state !== "expiring" ? (
        <div className={styles.callout} role="status">
          <Alert tone="attention">
            {t("expiringCallout", { count: expiringSoon })}
          </Alert>
          <Button href={hrefWith(path, sp, { state: "expiring" })} variant="outline" size="sm">
            {t("showThem")}
          </Button>
        </div>
      ) : null}
      <FilterBar fields={fields} />
      {query.event ? (
        <div className={styles.filters}>
          <span className={styles.chip}>
            {t("forOneEvent")}
            <Link href={hrefWith(path, sp, { event: null })} className={styles.icbtn} style={{ width: 28, height: 28 }} aria-label={t("clearEvent")}>
              ×
            </Link>
          </span>
        </div>
      ) : null}
      <div className={styles.tblWrap}>
        {rows.length === 0 ? (
          <div className={styles.cardBd}>
            <EmptyState icon="send" title={filtered ? t("emptyFiltered") : t("empty")} body={filtered ? t("emptyFilteredBody") : t("emptyBody")} />
          </div>
        ) : (
          <>
            <div className={`${styles.tblScroll} ${styles.onlyDesk}`} tabIndex={0}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.colEvent}>{t("colEvent")}</th>
                    <th scope="col">{t("colPurpose")}</th>
                    <th scope="col">{t("colSentTo")}</th>
                    <th scope="col" className={styles.hideMd}>{t("colCreated")}</th>
                    <th scope="col">{t("colExpires")}</th>
                    <th scope="col">{t("colUses")}</th>
                    <th scope="col">{t("colOpened")}</th>
                    <th scope="col" className={styles.hideMd}>{t("colOtp")}</th>
                    <th scope="col">{t("colState")}</th>
                    <th scope="col">
                      <span className={styles.srOnly}>{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}>
                      <td className={styles.colEvent}>
                        <div className={styles.col}>
                          <Link href={`/admin/events/${l.event.id}`} className={styles.tblT}>
                            {tx(l.event.title, locale)}
                          </Link>
                          <span className={styles.tblSub}>
                            {formatDayMonth(l.event.startsAt, locale)} · {tx(l.event.samithi.name, locale)}
                          </span>
                        </div>
                      </td>
                      <td>{l.label}</td>
                      <td className={styles.nowrap}>{sentTo(l)}</td>
                      <td className={`${styles.cap} ${styles.nowrap} ${styles.hideMd}`}>{formatDayMonth(l.createdAt, locale)}</td>
                      <td className={styles.nowrap}>
                        <span className={l.expiringSoon ? styles.late : undefined}>{fmtShortDateTime(l.expiresAt, locale)}</span>
                      </td>
                      <td className={`${styles.num} ${styles.nowrap}`}>{usesText(l.uses, l.maxUses)}</td>
                      <td className={`${styles.cap} ${styles.nowrap}`}>{l.lastOpenedAt ? fmtShortDateTime(l.lastOpenedAt, locale) : "—"}</td>
                      <td className={styles.hideMd}>{l.otpRequired ? t("otpYes") : t("otpNo")}</td>
                      <td>
                        <LinkStatePill state={l.state} />
                      </td>
                      <td>
                        <LinkActions link={l} canManage={canManage} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`${styles.cards} ${styles.onlyPhone}`} style={{ padding: 12 }}>
              {rows.map((l) => (
                <div className={styles.lcard} key={l.id}>
                  <div className={styles.row} style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                    <div className={styles.col} style={{ gap: 2 }}>
                      <Link href={`/admin/events/${l.event.id}`} className={styles.tblT}>
                        {tx(l.event.title, locale)}
                      </Link>
                      <span className={styles.cap}>
                        {l.label} · {tx(l.event.samithi.name, locale)}
                      </span>
                    </div>
                    <LinkStatePill state={l.state} />
                  </div>
                  <dl>
                    <dt>{t("colSentTo")}</dt>
                    <dd>{sentTo(l)}</dd>
                    <dt>{t("colExpires")}</dt>
                    <dd className={l.expiringSoon ? styles.late : undefined}>{fmtShortDateTime(l.expiresAt, locale)}</dd>
                    <dt>{t("colUses")}</dt>
                    <dd>{usesText(l.uses, l.maxUses)}</dd>
                    <dt>{t("colOpened")}</dt>
                    <dd>{l.lastOpenedAt ? fmtShortDateTime(l.lastOpenedAt, locale) : "—"}</dd>
                    <dt>{t("colOtp")}</dt>
                    <dd>{l.otpRequired ? t("otpYes") : t("otpNo")}</dd>
                  </dl>
                  <LinkActions link={l} canManage={canManage} compact />
                </div>
              ))}
            </div>
          </>
        )}
        {total > query.pageSize ? (
          <div className={styles.pagerWrap}>
            <Pagination page={query.page} pageSize={query.pageSize} total={total} href={(p) => hrefWith(path, sp, { page: p })} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
