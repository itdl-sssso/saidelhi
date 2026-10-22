"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type ApprovalCard, type BulkResult, adminEndpoints } from "@/contract";
import { SEVA_ICON } from "@/features/public/seva";
import { Link } from "@/i18n/navigation";
import { type AppLocale, formatDayMonth, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { StatusPill } from "@/ui/StatusPill";
import { useToast } from "@/ui/Toast";
import { ReasonDialog } from "../Dialogs";
import { MessageSquare } from "../icons";
import { useAction } from "../useAction";
import { fmtShortDateTime } from "../time";
import styles from "../Admin.module.css";
import s from "./Approvals.module.css";

const HOUR = 3_600_000;

export function ApprovalCards({ cards, nowIso, canDecide, tab }: { cards: ApprovalCard[]; nowIso: string; canDecide: boolean; tab: "plans" | "reports" | "escalated" }) {
  const t = useTranslations("admin.approvals");
  const tSeva = useTranslations("seva");
  const tChannel = useTranslations("admin.channel");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const { run, pending } = useAction();
  const [sel, setSel] = useState<string[]>([]);
  const [changes, setChanges] = useState<ApprovalCard | null>(null);
  const now = Date.parse(nowIso);
  const bulkAllowed = tab === "plans" && canDecide;

  if (cards.length === 0) {
    return <EmptyState icon="circle-check" title={t(`empty.${tab}`)} body={t("emptyBody")} />;
  }

  const approve = async (c: ApprovalCard) => {
    const action = c.kind === "plan" ? "approve-plan" : "approve-report";
    const res = await run(adminEndpoints.eventAction(c.event.id, action), { body: { version: c.event.version } }, { key: c.id, success: c.kind === "plan" ? t("planApproved") : t("reportApproved") });
    return res.ok;
  };

  const bulk = async () => {
    const res = await run<BulkResult>(adminEndpoints.approvalsBulk(), { body: { ids: sel, action: "approve" } }, { key: "bulk" });
    if (!res.ok) return;
    setSel([]);
    const { done, failed } = res.data;
    toast.show({ tone: failed.length ? "info" : "success", message: failed.length ? t("bulkPartial", { done: done.length, failed: failed.length }) : t("bulkDone", { count: done.length }) });
  };

  return (
    <>
      {bulkAllowed && sel.length ? (
        <div className={s.bulk} role="status">
          <span>{t("selected", { count: sel.length })}</span>
          <span className={s.sp} />
          <Button size="sm" icon="check" pending={pending === "bulk"} onClick={bulk}>
            {t("approveSelected", { count: sel.length })}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>
            {t("clear")}
          </Button>
        </div>
      ) : null}
      <div className={styles.stack} style={{ gap: 12 }}>
        {cards.map((c) => {
          const left = c.escalatesAt ? Date.parse(c.escalatesAt) - now : null;
          const hot = left !== null && left < 24 * HOUR;
          return (
            <article className={s.card} key={c.id} data-sel={sel.includes(c.id)}>
              <header className={s.hd}>
                {bulkAllowed ? (
                  <Checkbox
                    label={<span className={styles.srOnly}>{t("select", { title: tx(c.event.title, locale) })}</span>}
                    checked={sel.includes(c.id)}
                    onChange={() => setSel((x) => (x.includes(c.id) ? x.filter((i) => i !== c.id) : [...x, c.id]))}
                  />
                ) : null}
                <span className={`${styles.needIc} ${styles["t-blue"]}`}>
                  <Icon name={SEVA_ICON[c.event.sevaType]} size={20} />
                </span>
                <div className={s.hdMain}>
                  <Link href={`/admin/events/${c.event.id}`} className={s.title}>
                    {tx(c.event.title, locale)} · {tx(c.event.samithi.name, locale)}
                  </Link>
                  <span className={styles.cap}>
                    {tSeva(c.event.sevaType)} · {formatDayMonth(c.event.startsAt, locale)} · {t("submittedBy", { who: c.requestedBy?.label ?? t("unknown") })}
                    {c.channel ? ` · ${tChannel(c.channel)}` : ""} · {fmtShortDateTime(c.requestedAt, locale)}
                  </span>
                </div>
                <StatusPill status={c.state === "escalated" ? "escalated" : c.kind === "plan" ? "awaiting_approval" : "report_submitted"} />
              </header>
              {c.keyNumbers.length ? (
                <dl className={s.nums}>
                  {c.keyNumbers.map((k) => (
                    <div key={k.key}>
                      <dt>{tx(k.label, locale)}</dt>
                      <dd>{k.value ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <footer className={s.ft}>
                <span className={`${s.esc} ${hot || c.state === "escalated" ? s.escHot : ""}`}>
                  <Icon name="clock" size={16} />
                  {c.state === "escalated" ? t("withState") : left === null ? t("waiting", { count: c.waitingDays }) : left <= 0 ? t("escalatingNow") : left < 48 * HOUR ? t("escalatesHours", { count: Math.max(1, Math.ceil(left / HOUR)) }) : t("escalatesDays", { count: Math.ceil(left / (24 * HOUR)) })}
                </span>
                <span className={s.sp} />
                <Button href={`/admin/events/${c.event.id}`} variant="ghost" size="sm" iconAfter="arrow-right">
                  {t("open")}
                </Button>
                {canDecide || c.state === "escalated" ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setChanges(c)}>
                      <Icon icon={MessageSquare} size={16} />
                      {t("requestChanges")}
                    </Button>
                    <Button size="sm" icon="check" pending={pending === c.id} onClick={() => approve(c)}>
                      {t("approve")}
                    </Button>
                  </>
                ) : null}
              </footer>
            </article>
          );
        })}
      </div>
      <ReasonDialog
        open={changes !== null}
        onClose={() => setChanges(null)}
        title={t("rcTitle")}
        body={<p className={styles.sub}>{changes ? t("rcBody", { title: tx(changes.event.title, locale) }) : null}</p>}
        label={t("rcLabel")}
        confirmLabel={t("rcConfirm")}
        required
        pending={pending === "rc"}
        onSubmit={async (reason) => {
          if (!changes) return false;
          const res = await run(adminEndpoints.eventAction(changes.event.id, "request-changes"), { body: { version: changes.event.version, reason } }, { key: "rc", success: t("rcDone") });
          return res.ok;
        }}
      />
    </>
  );
}
