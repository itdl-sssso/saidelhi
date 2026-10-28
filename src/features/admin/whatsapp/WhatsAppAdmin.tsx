"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type ReminderRule, type WaStatus, type WaTemplate, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { EmptyState } from "@/ui/EmptyState";
import { Switch } from "@/ui/Switch";
import { SkeletonRows } from "@/ui/Skeleton";
import { PageHead, Panel, Pill, type Tone } from "../kit";
import { ScrollTabs } from "../ScrollTabs";
import { useAction } from "../useAction";
import { type UseApi, useApi } from "../useApi";
import { hrefWith } from "../url";
import { Broadcasts } from "./Broadcasts";
import { ConversationLog } from "./ConversationLog";
import styles from "../Admin.module.css";
import s from "./WhatsApp.module.css";

type TabId = "templates" | "reminders" | "broadcasts" | "log" | "status";
const ALL_TABS: TabId[] = ["templates", "reminders", "broadcasts", "log", "status"];

/** Shared loading / error shell for a client-fetched tab. */
export function Loadable<T, M>({ api, children }: { api: UseApi<T, M>; children: (data: T, meta: M | null) => React.ReactNode }) {
  const t = useTranslations("admin.whatsapp");
  if (api.status === "loading") return <div className={styles.card}><SkeletonRows /></div>;
  if (api.status === "forbidden") return <EmptyState icon="lock" title={t("forbidden")} />;
  if (api.status !== "ready")
    return (
      <EmptyState
        icon="cloud-off"
        title={t("loadError")}
        action={
          <button type="button" className={styles.linkBtn} onClick={api.reload}>
            {t("retry")}
          </button>
        }
      />
    );
  return <>{children(api.data, api.meta)}</>;
}

export function WhatsAppAdmin({ canManage, canReminders }: { canManage: boolean; canReminders: boolean }) {
  const t = useTranslations("admin.whatsapp");
  const sp = useSearchParams();
  const tabs = canManage ? ALL_TABS : canReminders ? (["reminders"] as TabId[]) : [];
  const raw = sp.get("tab") as TabId | null;
  const tab: TabId = raw && tabs.includes(raw) ? raw : tabs[0];
  const params = Object.fromEntries(sp.entries());
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      {tabs.length > 1 ? (
        <ScrollTabs label={t("tabsLabel")}>
          {tabs.map((id) => (
            <Link key={id} href={hrefWith("/admin/whatsapp", params, { tab: id === "templates" ? null : id })} className={styles.tab} aria-current={tab === id ? "page" : undefined}>
              {t(`tab.${id}`)}
            </Link>
          ))}
        </ScrollTabs>
      ) : null}
      {tab === "templates" ? <Templates /> : null}
      {tab === "reminders" ? <Reminders /> : null}
      {tab === "broadcasts" ? <Broadcasts /> : null}
      {tab === "log" ? <ConversationLog /> : null}
      {tab === "status" ? <Status /> : null}
    </div>
  );
}

const META: Record<WaTemplate["metaStatus"], [Tone, "badge-check" | "hourglass" | "circle-x" | "info"]> = {
  approved: ["green", "badge-check"],
  pending: ["yellow", "hourglass"],
  rejected: ["error", "circle-x"],
  not_required: ["slate", "info"],
};

function Templates() {
  const t = useTranslations("admin.whatsapp");
  const api = useApi<WaTemplate[]>(adminEndpoints.waTemplates());
  return (
    <Loadable api={api}>
      {(rows) => (
        <>
          <p className={styles.cap}>{t("templates.note")}</p>
          <ul className={s.cards}>
            {rows.map((r) => (
              <li key={r.id} className={s.tcard}>
                <div className={s.tHead}>
                  <span className={s.tName}>
                    <code className={styles.mono}>{r.name}</code>
                    <span className={styles.cap}>{t(`category.${r.category}`)}</span>
                  </span>
                  <Pill tone={META[r.metaStatus][0]} icon={META[r.metaStatus][1]}>
                    {t(`meta.${r.metaStatus}`)}
                  </Pill>
                </div>
                <div className={s.tTexts}>
                  <div>
                    <span className={s.tLang}>EN</span>
                    <p lang="en">{r.text.en}</p>
                  </div>
                  <div>
                    <span className={s.tLang}>HI</span>
                    {r.text.hi ? <p lang="hi">{r.text.hi}</p> : <p className={s.muted}>{t("templates.noHindi")}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Loadable>
  );
}

function Reminders() {
  const t = useTranslations("admin.whatsapp");
  const locale = useLocale() as AppLocale;
  const api = useApi<ReminderRule[]>(adminEndpoints.waReminders());
  const { run } = useAction();
  // Optimistic only for toggles (CONTRACT §6): the switch flips at once and flips back on failure.
  const [over, setOver] = useState<Record<string, boolean>>({});
  const toggle = async (r: ReminderRule, enabled: boolean) => {
    setOver((o) => ({ ...o, [r.id]: enabled }));
    const res = await run(adminEndpoints.waReminder(r.id), { method: "PATCH", body: { enabled } }, { key: r.id, refresh: false, success: t("reminders.saved") });
    if (!res.ok)
      setOver((o) => {
        const rest = { ...o };
        delete rest[r.id];
        return rest;
      });
  };
  return (
    <Loadable api={api}>
      {(rows) => (
        <Panel title={t("reminders.title")} flush>
          <ul className={s.rules}>
            {rows.map((r) => (
              <li key={r.id} className={s.rule}>
                <span className={s.ruleT}>
                  <span className={styles.strong}>{tx(r.label, locale)}</span>
                  <span className={styles.cap}>{tx(r.description, locale)}</span>
                  {r.copyDistrict ? <span className={styles.cap}>{t("reminders.copyDistrict")}</span> : null}
                </span>
                <Switch label={<span className={styles.srOnly}>{tx(r.label, locale)}</span>} checked={over[r.id] ?? r.enabled} onChange={(e) => void toggle(r, e.target.checked)} />
              </li>
            ))}
          </ul>
          <p className={s.foot}>{t("reminders.global")} {t("reminders.quiet")}</p>
        </Panel>
      )}
    </Loadable>
  );
}

function Status() {
  const t = useTranslations("admin.whatsapp");
  const locale = useLocale() as AppLocale;
  const api = useApi<WaStatus>(adminEndpoints.waStatus());
  const nf = new Intl.NumberFormat(locale === "hi" ? "hi-IN" : "en-IN");
  return (
    <Loadable api={api}>
      {(d) => (
        <div className={`${styles.grid} ${styles.g2}`} style={{ alignItems: "start" }}>
          <Panel
            title={d.number ?? t("status.noNumber")}
            badge={d.provider === "cloud" ? <Pill tone="green" icon="circle-check">{t("status.connected")}</Pill> : <Pill tone="yellow" icon="info">{t("status.console")}</Pill>}
          >
            <dl className={styles.dl}>
              <dt>{t("status.provider")}</dt>
              <dd>{t(`status.providers.${d.provider}`)}</dd>
              <dt>{t("status.coexistence")}</dt>
              <dd>{d.coexistence ? t("status.on") : t("status.off")}</dd>
              <dt>{t("status.optedIn")}</dt>
              <dd>{nf.format(d.optedIn)}</dd>
            </dl>
            {d.coexistence ? <Alert tone="note">{t("status.coexistenceNote")}</Alert> : null}
            {d.provider === "console" ? <Alert tone="attention">{t("status.consoleNote")}</Alert> : null}
          </Panel>
          <Panel title={t("status.month")}>
            <dl className={styles.dl}>
              <dt>{t("status.messages")}</dt>
              <dd>{nf.format(d.monthMessages)}</dd>
              <dt>{t("status.cost")}</dt>
              <dd>₹{nf.format(d.monthCostInr)}</dd>
            </dl>
            <p className={styles.cap}>{t("status.costNote")}</p>
          </Panel>
        </div>
      )}
    </Loadable>
  );
}
