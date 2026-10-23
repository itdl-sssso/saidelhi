"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type FollowUpDetail, type FollowUpRow, FollowUpStatus, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { formatDate, formatIsoDate, type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { DateField } from "@/ui/DateField";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon, type IconName } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { SideSheet } from "@/ui/SideSheet";
import { SkeletonRows } from "@/ui/Skeleton";
import { FilterBar, type FilterField } from "../FilterBar";
import { PageHead, Pill, type Tone } from "../kit";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable, Restricted, TableFoot } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const STATUS: Record<FollowUpStatus, { tone: Tone; icon: IconName }> = {
  referred: { tone: "blue", icon: "send" },
  scheduled: { tone: "yellow", icon: "calendar-check" },
  done: { tone: "green", icon: "circle-check" },
  declined: { tone: "slate", icon: "circle-x" },
  unreachable: { tone: "pink", icon: "phone" },
};
const STATUS_FILTER = ["open", "all", ...FollowUpStatus.options] as const;
const WAITING = ["7", "14", "30"] as const;
const OUTCOMES = ["answered", "no_answer", "wrong_number", "call_back"] as const;
const REVEAL_MS = 60_000;

export function FollowUpPage({ canReveal }: { canReveal: boolean }) {
  const t = useTranslations("admin.followup");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const status = (STATUS_FILTER as readonly string[]).includes(sp.get("status") ?? "") ? sp.get("status")! : "open";
  const q = sp.get("q") || undefined;
  const waiting = (WAITING as readonly string[]).includes(sp.get("waiting") ?? "") ? Number(sp.get("waiting")) : undefined;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<FollowUpRow[], { total: number; page: number; pageSize: number }>(adminEndpoints.followUp({ status, q, waitingMin: waiting, page, pageSize: 20 }));
  const [selected, setSelected] = useState<string | null>(null);
  // Revealed numbers live only in this component's state; they are dropped after a minute and on unmount.
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  useEffect(() => {
    const live = timers.current;
    return () => Object.values(live).forEach(clearTimeout);
  }, []);
  const { run, pending } = useAction();

  const reveal = async (row: FollowUpRow) => {
    const res = await run<{ phone: string }>(adminEndpoints.followUpReveal(row.id), {}, { key: `rv-${row.id}`, refresh: false });
    if (!res.ok) return;
    setRevealed((m) => ({ ...m, [row.id]: res.data.phone }));
    clearTimeout(timers.current[row.id]);
    timers.current[row.id] = setTimeout(() => setRevealed((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== row.id))), REVEAL_MS);
  };

  const fields: FilterField[] = [
    { kind: "search", key: "q", label: t("search") },
    { kind: "select", key: "status", label: t("colStatus"), defaultValue: "open", options: STATUS_FILTER.map((s) => ({ value: s, label: t(`filter_${s}`) })) },
    { kind: "select", key: "waiting", label: t("colWaiting"), options: WAITING.map((w) => ({ value: w, label: t("waitingMin", { n: Number(w) }) })) },
  ];

  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <Restricted title={t("bannerTitle")}>{t("banner")}</Restricted>
      <FilterBar fields={fields} />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="heart-pulse" title={q || waiting || status !== "open" ? t("noMatch") : t("empty")} />
              </div>
            ) : (
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colName")}</th>
                      <th scope="col">{t("colAge")}</th>
                      <th scope="col">{t("colGender")}</th>
                      <th scope="col">{t("colLocality")}</th>
                      <th scope="col">{t("colPhone")}</th>
                      <th scope="col">{t("colCamp")}</th>
                      <th scope="col">{t("colReferred")}</th>
                      <th scope="col">{t("colStatus")}</th>
                      <th scope="col">{t("colWaiting")}</th>
                      <th scope="col">{t("colConsent")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const full = revealed[r.id];
                      const closed = r.status === "done" || r.status === "declined";
                      return (
                        <tr key={r.id}>
                          <td>
                            <span className={styles.tblT}>{r.name}</span>
                          </td>
                          <td>{r.age ?? "—"}</td>
                          <td>{r.gender ? t(`gender_${r.gender}`) : "—"}</td>
                          <td>{r.locality ?? "—"}</td>
                          <td>
                            {r.phone === null ? (
                              "—"
                            ) : (
                              <span className={styles.row} style={{ gap: 6, flexWrap: "nowrap" }}>
                                <span className={styles.mono}>{full ?? r.phone}</span>
                                {full ? (
                                  <Pill tone="slate" icon="eye">
                                    {t("logged")}
                                  </Pill>
                                ) : canReveal ? (
                                  <button type="button" className={p.reveal} disabled={pending === `rv-${r.id}`} aria-label={t("revealFor", { name: r.name })} onClick={() => reveal(r)}>
                                    <Icon name="eye" size={16} />
                                    {t("reveal")}
                                  </button>
                                ) : null}
                              </span>
                            )}
                          </td>
                          <td>
                            <Link href={`/admin/events/${r.camp.eventId}`} className={styles.tblT}>
                              {tx(r.camp.title, locale)}
                            </Link>
                            <br />
                            <span className={styles.tblSub}>{tx(r.camp.samithi.name, locale)}</span>
                          </td>
                          <td>{formatIsoDate(r.referredAt, locale)}</td>
                          <td>
                            <Pill tone={STATUS[r.status].tone} icon={STATUS[r.status].icon}>
                              {t(`status_${r.status}`)}
                            </Pill>
                          </td>
                          <td>
                            <span className={!closed && r.daysWaiting > 14 ? p.late : undefined}>{t("days", { count: r.daysWaiting })}</span>
                          </td>
                          <td>
                            {r.consent ? (
                              <span className={p.consentOk} role="img" aria-label={t("consentGiven")}>
                                <Icon name="circle-check" size={18} />
                              </span>
                            ) : (
                              <span aria-label={t("consentMissing")}>—</span>
                            )}
                          </td>
                          <td>
                            <Button size="sm" variant="outline" onClick={() => setSelected(r.id)}>
                              {t("update")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {meta && meta.total > meta.pageSize ? (
              <div className={styles.pagerWrap}>
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/follow-up", params, { page: n })} />
              </div>
            ) : null}
            <TableFoot icon="clock">{t("foot")}</TableFoot>
          </div>
        )}
      </Loadable>
      <UpdateSheet id={selected} onClose={() => setSelected(null)} onChanged={api.reload} />
    </div>
  );
}

function UpdateSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const t = useTranslations("admin.followup");
  const api = useApi<FollowUpDetail>(id ? adminEndpoints.followUpItem(id) : null);
  return (
    <SideSheet open={id !== null} onClose={onClose} title={api.status === "ready" ? api.data.name : t("update")}>
      {id === null ? null : api.status === "loading" ? (
        <SkeletonRows rows={4} />
      ) : (
        <Loadable api={api}>{(d) => <UpdateForm key={`${d.id}-${d.version}`} d={d} onSaved={() => { api.reload(); onChanged(); }} />}</Loadable>
      )}
    </SideSheet>
  );
}

function UpdateForm({ d, onSaved }: { d: FollowUpDetail; onSaved: () => void }) {
  const t = useTranslations("admin.followup");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [status, setStatus] = useState<FollowUpStatus>(d.status);
  const [surgery, setSurgery] = useState(d.surgeryDate ?? "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [callOpen, setCallOpen] = useState(false);

  const dirty = status !== d.status || surgery !== (d.surgeryDate ?? "") || note.trim() !== "";
  const save = async () => {
    const body: Record<string, unknown> = { version: d.version };
    if (status !== d.status) body.status = status;
    if (surgery !== (d.surgeryDate ?? "")) body.surgeryDate = surgery || null;
    if (note.trim()) body.note = note.trim();
    const res = await run(adminEndpoints.followUpItem(d.id), { method: "PATCH", body }, { key: "save", success: t("saved"), quiet422: true, refresh: false, onReload: onSaved });
    if (res.ok) onSaved();
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  return (
    <div className={styles.stack}>
      {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
      <Select label={t("colStatus")} value={status} onChange={(e) => setStatus(e.target.value as FollowUpStatus)} options={FollowUpStatus.options.map((s) => ({ value: s, label: t(`status_${s}`) }))} />
      <DateField id="fu-surgery" label={t("surgeryDate")} optional value={surgery} onChange={setSurgery} messages={errors.surgeryDate ? [{ type: "error", text: errors.surgeryDate }] : undefined} />
      <Textarea label={t("note")} optional rows={3} maxLength={1000} value={note} error={errors.note} onChange={(e) => setNote(e.target.value)} />
      <div className={styles.row} style={{ justifyContent: "flex-end" }}>
        <Button variant="outline" icon="phone" onClick={() => setCallOpen(true)}>
          {t("logCall")}
        </Button>
        <Button pending={pending === "save"} disabled={!dirty} onClick={save}>
          {t("save")}
        </Button>
      </div>
      <h3 className={styles.cardTitle}>{t("history")}</h3>
      {d.history.length === 0 ? (
        <span className={styles.cap}>{t("noHistory")}</span>
      ) : (
        <ul className={styles.log}>
          {d.history.map((h, i) => (
            <li key={`${h.at}-${i}`}>
              <time dateTime={h.at}>{formatDate(h.at, locale)}</time>
              <span>
                {h.text}
                {h.by ? <span className={styles.cap}> · {h.by}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <CallDialog open={callOpen} d={d} onClose={() => setCallOpen(false)} onSaved={() => { setCallOpen(false); onSaved(); }} />
    </div>
  );
}

function CallDialog({ open, d, onClose, onSaved }: { open: boolean; d: FollowUpDetail; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("admin.followup");
  const { run, pending } = useAction();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("answered");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async () => {
    const m = minutes.trim() === "" ? null : Number(minutes);
    if (m !== null && (!Number.isInteger(m) || m < 0 || m > 180)) return setErrors({ minutes: t("errMinutes") });
    const res = await run(adminEndpoints.followUpCalls(d.id), { body: { outcome, minutes: m, note: note.trim() || undefined, version: d.version } }, { key: "call", success: t("callLogged"), quiet422: true, refresh: false, onReload: onSaved });
    if (res.ok) {
      setMinutes("");
      setNote("");
      setErrors({});
      onSaved();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("logCall")}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "call"} onClick={save}>
            {t("saveCall")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
        <Select label={t("outcome")} value={outcome} onChange={(e) => setOutcome(e.target.value as (typeof OUTCOMES)[number])} options={OUTCOMES.map((o) => ({ value: o, label: t(`outcome_${o}`) }))} />
        <Input label={t("minutes")} optional inputMode="numeric" value={minutes} error={errors.minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        <Textarea label={t("note")} optional rows={3} maxLength={1000} value={note} error={errors.note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Dialog>
  );
}
