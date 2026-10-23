"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  type ConsentSummary,
  type PersonDataMatch,
  type PrivacyOverview,
  type PrivacyRequestDetail,
  type PrivacyRequestRow,
  type PrivacyStep,
  type RetentionJob,
  PrivacyRequestStatus,
  adminEndpoints,
} from "@/contract";
import { formatDate, tx, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Textarea } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { Switch } from "@/ui/Switch";
import { download } from "../download";
import { PageHead, Panel, Pill } from "../kit";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { LinkTabs, Loadable, Note, Restricted, TableFoot } from "../parts";
import { BreachesTab } from "./BreachesTab";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const TABS = ["requests", "consents", "retention", "breaches"] as const;
type Tab = (typeof TABS)[number];

export function PrivacyPage() {
  const t = useTranslations("admin.privacy");
  const sp = useSearchParams();
  const tab: Tab = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "requests";
  const ov = useApi<PrivacyOverview>(adminEndpoints.privacy());
  const labels = Object.fromEntries(TABS.map((x) => [x, t(`tab_${x}`)])) as Record<Tab, string>;
  const counts = ov.status === "ready" ? { requests: ov.data.counts.openRequests, breaches: ov.data.counts.openBreaches } : undefined;
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <LinkTabs path="/admin/privacy" tabs={TABS} current={tab} label={t("tabsLabel")} labels={labels} counts={counts} />
      <Loadable api={ov} rows={4}>
        {(o) => (
          <>
            {!o.can.manage ? <Alert tone="note">{t("readOnly")}</Alert> : null}
            {tab === "requests" ? <RequestsTab can={o.can.manage} /> : null}
            {tab === "consents" ? <ConsentsTab /> : null}
            {tab === "retention" ? <RetentionTab can={o.can.manage} /> : null}
            {tab === "breaches" ? <BreachesTab overview={o} onDpoSaved={ov.reload} /> : null}
          </>
        )}
      </Loadable>
    </div>
  );
}

// ---- Requests ---------------------------------------------------------------

function RequestsTab({ can }: { can: boolean }) {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const params = Object.fromEntries(sp.entries());
  const [sel, setSel] = useState<string | null>(null);
  const api = useApi<PrivacyRequestRow[], { total: number; page: number; pageSize: number }>(adminEndpoints.privacyRequests({ page, pageSize: 15 }));
  return (
    <div className={styles.stack}>
      <Restricted title={t("restrictedTitle")}>{t("restricted")}</Restricted>
      <div className={p.splitMain}>
        <Loadable api={api} rows={5}>
          {(rows, meta) =>
            rows.length === 0 ? (
              <div className={styles.card}>
                <div className={styles.cardBd}>
                  <EmptyState icon="shield-check" title={t("noRequests")} />
                </div>
              </div>
            ) : (
              <div className={styles.tblWrap}>
                <div className={styles.tblScroll}>
                  <table className={styles.tbl}>
                    <thead>
                      <tr>
                        <th scope="col">{t("colRef")}</th>
                        <th scope="col">{t("colFrom")}</th>
                        <th scope="col">{t("colAsks")}</th>
                        <th scope="col">{t("colReceived")}</th>
                        <th scope="col">{t("colDue")}</th>
                        <th scope="col">{t("colStatus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} aria-selected={sel === r.id}>
                          <td>
                            <button type="button" className={styles.linkBtn} aria-label={t("openRequest", { ref: r.ref })} onClick={() => setSel(r.id)}>
                              <span className={styles.mono}>{r.ref}</span>
                            </button>
                          </td>
                          <td>{r.name}</td>
                          <td>{t(`type_${r.type}`)}</td>
                          <td>{formatDate(r.receivedAt, locale)}</td>
                          <td>
                            {r.closedAt ? <span className={styles.cap}>{t("repliedOn", { date: formatDate(r.closedAt, locale) })}</span> : <span className={r.daysLeft < 0 ? p.late : r.daysLeft < 15 ? p.soon : undefined}>{r.daysLeft < 0 ? t("overdue", { count: -r.daysLeft }) : t("daysLeft", { count: r.daysLeft })}</span>}
                          </td>
                          <td>
                            <StatusPill status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {meta && meta.total > meta.pageSize ? (
                  <div className={styles.pagerWrap}>
                    <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/privacy", params, { page: n })} />
                  </div>
                ) : null}
                <TableFoot>{t("openLogged")}</TableFoot>
              </div>
            )
          }
        </Loadable>
        {sel ? <RequestPanel id={sel} can={can} onClose={() => setSel(null)} onChanged={api.reload} /> : <Panel title={t("detail")}><EmptyState icon="shield-check" title={t("pickRequest")} /></Panel>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: PrivacyRequestStatus }) {
  const t = useTranslations("admin.privacy");
  return status === "done" ? (
    <Pill tone="green" icon="circle-check">
      {t("status_done")}
    </Pill>
  ) : status === "rejected" ? (
    <Pill tone="slate" icon="circle-x">
      {t("status_rejected")}
    </Pill>
  ) : status === "in_progress" ? (
    <Pill tone="blue" icon="search">
      {t("status_in_progress")}
    </Pill>
  ) : (
    <Pill tone="yellow" icon="hourglass">
      {t("status_received")}
    </Pill>
  );
}

function RequestPanel({ id, can, onClose, onChanged }: { id: string; can: boolean; onClose: () => void; onChanged: () => void }) {
  const t = useTranslations("admin.privacy");
  const api = useApi<PrivacyRequestDetail>(adminEndpoints.privacyRequest(id));
  return (
    <Loadable api={api} rows={5}>
      {(d) => <RequestBody key={`${d.id}-${d.version}`} d={d} can={can && d.can.act} onClose={onClose} onSaved={() => { api.reload(); onChanged(); }} title={t("requestTitle", { ref: d.ref, type: t(`type_${d.type}`) })} />}
    </Loadable>
  );
}

const STEPS: PrivacyStep[] = ["found", "exported", "erased", "replied"];

function RequestBody({ d, can, onClose, onSaved, title }: { d: PrivacyRequestDetail; can: boolean; onClose: () => void; onSaved: () => void; title: string }) {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [eraseOpen, setEraseOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const base = { version: d.version };
  const post = async (action: "find", okMsg: string) => {
    const res = await run(adminEndpoints.privacyRequestAction(d.id, action), { body: base }, { key: action, success: okMsg, refresh: false, onReload: onSaved });
    if (res.ok) onSaved();
  };
  const exportData = async () => {
    const ok = await download(adminEndpoints.privacyRequestExport(d.id), `${d.ref}.json`);
    if (ok) onSaved();
  };
  const setStatus = async (status: PrivacyRequestStatus) => {
    const res = await run(adminEndpoints.privacyRequest(d.id), { method: "PATCH", body: { status, version: d.version } }, { key: "status", success: t("saved"), refresh: false, onReload: onSaved });
    if (res.ok) onSaved();
  };
  const matches = d.matches;
  const erasable = (matches ?? []).filter((m) => m.erasable);
  const label = (s: PrivacyStep) =>
    s === "found" ? (matches ? t("stepFoundDone", { count: matches.length }) : t("stepFound")) : t(`step_${s}`);
  return (
    <Panel
      title={title}
      action={
        <button type="button" className={styles.linkBtn} onClick={onClose}>
          {t("close")}
        </button>
      }
    >
      <div className={p.clock}>
        <Icon name="timer" size={20} />
        <span className={p.clockT}>
          <b className={p.clockBig}>{d.closedAt ? t("closedOn", { date: formatDate(d.closedAt, locale) }) : d.daysLeft < 0 ? t("overdue", { count: -d.daysLeft }) : t("daysLeft", { count: d.daysLeft })}</b>
          <span>{t("replyBy", { date: formatDate(d.dueAt, locale) })}</span>
        </span>
      </div>
      <div className={styles.stack} style={{ gap: 6 }}>
        <span className={styles.cap}>
          {d.name} · <span className={styles.mono}>{d.phone}</span>
        </span>
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{d.details}</p>
      </div>
      {can ? (
        <Select label={t("colStatus")} value={d.status} disabled={pending === "status"} onChange={(e) => setStatus(e.target.value as PrivacyRequestStatus)} options={PrivacyRequestStatus.options.map((s) => ({ value: s, label: t(`status_${s}`) }))} />
      ) : null}
      <ol className={p.checklist}>
        {STEPS.map((s) => {
          const at = d.steps[s];
          return (
            <li key={s}>
              <span className={at ? p.chkDone : p.chkPend}>
                <Icon name={at ? "circle-check" : "clock"} size={18} />
              </span>
              <span>
                {label(s)}
                {at ? <span className={styles.cap}> · {formatDate(at, locale)}</span> : null}
              </span>
              {can ? (
                s === "found" ? (
                  <Button variant="outline" size="sm" icon="search" pending={pending === "find"} onClick={() => post("find", t("foundOk"))}>
                    {matches ? t("findAgain") : t("find")}
                  </Button>
                ) : s === "exported" ? (
                  <Button variant="ghost" size="sm" icon="arrow-down" disabled={!matches} onClick={exportData}>
                    {t("export")}
                  </Button>
                ) : s === "erased" ? (
                  <Button variant="outline" size="sm" icon="trash-2" disabled={erasable.length === 0} onClick={() => setEraseOpen(true)}>
                    {t("eraseN", { count: erasable.length })}
                  </Button>
                ) : (
                  <Button size="sm" icon="send" onClick={() => setReplyOpen(true)}>
                    {t("reply")}
                  </Button>
                )
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ol>
      {matches && matches.length > 0 ? (
        <ul className={p.matchList}>
          {matches.map((m) => (
            <li key={m.id}>
              <span>{t(`kind_${m.kind}`)}</span>
              <span className={styles.cap}>{m.label}</span>
            </li>
          ))}
        </ul>
      ) : matches ? (
        <span className={styles.cap}>{t("noMatches")}</span>
      ) : null}
      <Note>{t("countsStay")}</Note>
      {d.history.length ? (
        <ul className={styles.log}>
          {d.history.map((h, i) => (
            <li key={`${h.at}-${i}`}>
              <time dateTime={h.at}>{formatDate(h.at, locale)}</time>
              <span>
                {h.action}
                {h.by ? <span className={styles.cap}> · {h.by}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {eraseOpen ? <EraseDialog d={d} matches={erasable} onClose={() => setEraseOpen(false)} onDone={() => { setEraseOpen(false); onSaved(); }} /> : null}
      {replyOpen ? <ReplyDialog d={d} onClose={() => setReplyOpen(false)} onDone={() => { setReplyOpen(false); onSaved(); }} /> : null}
    </Panel>
  );
}

function EraseDialog({ d, matches, onClose, onDone }: { d: PrivacyRequestDetail; matches: PersonDataMatch[]; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("admin.privacy");
  const { run, pending } = useAction();
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(matches.map((m) => m.id)));
  const [error, setError] = useState("");
  const toggle = (id: string) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const erase = async () => {
    const res = await run(adminEndpoints.privacyRequestAction(d.id, "erase"), { body: { matchIds: [...chosen], version: d.version } }, { key: "erase", success: t("erased"), quiet422: true, refresh: false, onReload: onDone });
    if (res.ok) onDone();
    else if (res.status === 422) setError(res.error.message);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("eraseTitle", { count: chosen.size })}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="outline" icon="trash-2" disabled={chosen.size === 0} pending={pending === "erase"} onClick={erase}>
            {t("eraseConfirm", { count: chosen.size })}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Alert tone="attention">{t("eraseWarn")}</Alert>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {matches.map((m) => (
          <Checkbox key={m.id} checked={chosen.has(m.id)} onChange={() => toggle(m.id)} label={<span>{t(`kind_${m.kind}`)} <span className={styles.cap}>· {m.label}</span></span>} />
        ))}
        <Note>{t("countsStay")}</Note>
      </div>
    </Dialog>
  );
}

function ReplyDialog({ d, onClose, onDone }: { d: PrivacyRequestDetail; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("admin.privacy");
  const { run, pending } = useAction();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const send = async () => {
    if (message.trim().length < 5) return setError(t("errReply"));
    const res = await run(adminEndpoints.privacyRequestAction(d.id, "reply"), { body: { message: message.trim(), version: d.version } }, { key: "reply", success: t("replySent"), quiet422: true, refresh: false, onReload: onDone });
    if (res.ok) onDone();
    else if (res.status === 422) setError(res.error.fields?.message ?? res.error.message);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("replyTitle")}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button icon="send" pending={pending === "reply"} onClick={send}>
            {t("send")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <span className={styles.cap}>{t("replyVia", { phone: d.phone, lang: d.locale === "hi" ? t("langHi") : t("langEn") })}</span>
        <Textarea label={t("message")} rows={5} maxLength={2000} value={message} error={error} onChange={(e) => { setMessage(e.target.value); setError(""); }} />
      </div>
    </Dialog>
  );
}

// ---- Consents ---------------------------------------------------------------

function ConsentsTab() {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const api = useApi<ConsentSummary>(adminEndpoints.privacyConsents());
  return (
    <Loadable api={api} rows={5}>
      {(c) => (
        <div className={styles.stack}>
          <div className={p.kpis}>
            <div className={p.stat}><span className={styles.cap}>{t("optedIn")}</span><b className={p.statN}>{c.whatsappOptins.optedIn}</b></div>
            <div className={p.stat}><span className={styles.cap}>{t("optPending")}</span><b className={p.statN}>{c.whatsappOptins.pending}</b></div>
            <div className={p.stat}><span className={styles.cap}>{t("optStopped")}</span><b className={p.statN}>{c.whatsappOptins.stopped}</b></div>
          </div>
          <Panel title={t("byForm")} flush>
            {c.byForm.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="shield-check" title={t("noConsents")} />
              </div>
            ) : (
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colForm")}</th>
                      <th scope="col">{t("colPurpose")}</th>
                      <th scope="col">{t("colGiven")}</th>
                      <th scope="col">{t("colWithdrawn")}</th>
                      <th scope="col">{t("colLast")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.byForm.map((r) => (
                      <tr key={`${r.templateId}-${r.purpose}`}>
                        <td>{tx(r.form, locale)}</td>
                        <td>{r.purpose}</td>
                        <td>{r.given}</td>
                        <td>{r.withdrawn}</td>
                        <td>{r.lastAt ? formatDate(r.lastAt, locale) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          <Panel title={t("withdrawals")}>
            {c.recentWithdrawals.length === 0 ? (
              <span className={styles.cap}>{t("noWithdrawals")}</span>
            ) : (
              <ul className={styles.log}>
                {c.recentWithdrawals.map((w, i) => (
                  <li key={`${w.at}-${i}`}>
                    <time dateTime={w.at}>{formatDate(w.at, locale)}</time>
                    <span>
                      {tx(w.form, locale)} <span className={styles.cap}>· {w.purpose}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </Loadable>
  );
}

// ---- Retention --------------------------------------------------------------

function RetentionTab({ can }: { can: boolean }) {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const api = useApi<RetentionJob[]>(adminEndpoints.privacyRetention());
  const { run, pending } = useAction();
  const toggle = async (j: RetentionJob, enabled: boolean) => {
    const res = await run(adminEndpoints.privacyRetentionJob(j.key), { method: "PATCH", body: { enabled } }, { key: j.key, success: t("saved"), refresh: false, onReload: api.reload });
    if (res.ok) api.reload();
  };
  return (
    <Loadable api={api} rows={5}>
      {(jobs) => (
        <Panel title={t("retentionTitle")} flush>
          {jobs.length === 0 ? (
            <div className={styles.cardBd}>
              <EmptyState icon="clock" title={t("noJobs")} />
            </div>
          ) : (
            <div className={styles.tblScroll}>
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th scope="col">{t("colData")}</th>
                    <th scope="col">{t("colKept")}</th>
                    <th scope="col">{t("colLastRun")}</th>
                    <th scope="col">{t("colDeleted")}</th>
                    <th scope="col">{t("colDue")}</th>
                    <th scope="col">{t("colNext")}</th>
                    <th scope="col">{t("colOn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.key}>
                      <td>
                        <span className={styles.tblT}>{t(`job_${j.key}`)}</span>
                      </td>
                      <td>{tx(j.keptFor, locale)}</td>
                      <td>{j.lastRunAt ? formatDate(j.lastRunAt, locale) : "—"}</td>
                      <td>{j.lastDeleted ?? "—"}</td>
                      <td>{j.due}</td>
                      <td>{j.nextRunAt ? formatDate(j.nextRunAt, locale) : "—"}</td>
                      <td>
                        {j.locked ? (
                          <Pill tone="slate" icon="lock">
                            {t("always")}
                          </Pill>
                        ) : can ? (
                          <Switch label={<span className={styles.srOnly}>{t(`job_${j.key}`)}</span>} checked={j.enabled} disabled={pending === j.key} onChange={(e) => toggle(j, e.target.checked)} />
                        ) : (
                          <Pill tone={j.enabled ? "green" : "slate"}>{j.enabled ? t("on") : t("off")}</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TableFoot icon="info">{t("retentionFoot")}</TableFoot>
        </Panel>
      )}
    </Loadable>
  );
}
