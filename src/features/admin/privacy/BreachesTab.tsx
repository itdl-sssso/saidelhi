"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type Breach, type BreachStepKey, type PrivacyOverview, adminEndpoints } from "@/contract";
import { formatDate, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { Panel, Pill } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable } from "../parts";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

export function BreachesTab({ overview, onDpoSaved }: { overview: PrivacyOverview; onDpoSaved: () => void }) {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const api = useApi<Breach[]>(adminEndpoints.privacyBreaches());
  const [create, setCreate] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const can = overview.can.manage;
  return (
    <div className={styles.stack}>
      {can ? (
        <div className={styles.row} style={{ justifyContent: "flex-end" }}>
          <Button icon="triangle-alert" onClick={() => setCreate(true)}>
            {t("startBreach")}
          </Button>
        </div>
      ) : null}
      <div className={p.splitMain}>
        <Loadable api={api} rows={4}>
          {(rows) => {
            const open = rows.filter((b) => b.status === "open");
            const past = rows.filter((b) => b.status === "closed");
            const shown = rows.find((b) => b.id === sel) ?? open[0] ?? null;
            return (
              <div className={styles.stack}>
                {rows.length === 0 ? (
                  <Panel>
                    <EmptyState icon="shield-check" title={t("noBreaches")} />
                  </Panel>
                ) : null}
                {shown ? <BreachPanel key={`${shown.id}-${shown.version}`} b={shown} can={can} onSaved={api.reload} /> : null}
                {past.length ? (
                  <Panel title={t("pastBreaches")} flush>
                    <ul className={p.pastList}>
                      {rows.map((b) => (
                        <li key={b.id}>
                          <button type="button" className={styles.linkBtn} aria-current={shown?.id === b.id} onClick={() => setSel(b.id)}>
                            <span className={styles.mono}>{b.ref}</span> · {b.title}
                          </button>
                          <span className={styles.cap}>{formatDate(b.discoveredAt, locale)}</span>
                          <Pill tone={b.status === "closed" ? "green" : "pink"} icon={b.status === "closed" ? "circle-check" : "triangle-alert"}>
                            {t(`breach_${b.status}`)}
                          </Pill>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                ) : null}
              </div>
            );
          }}
        </Loadable>
        <DpoPanel overview={overview} onSaved={onDpoSaved} />
      </div>
      {create ? <CreateDialog onClose={() => setCreate(false)} onCreated={(id) => { setCreate(false); setSel(id); api.reload(); }} /> : null}
    </div>
  );
}

const STEP_KEYS: BreachStepKey[] = ["contain", "assess", "notify_board", "notify_people", "lessons"];

function BreachPanel({ b, can, onSaved }: { b: Breach; can: boolean; onSaved: () => void }) {
  const t = useTranslations("admin.privacy");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [now] = useState(() => Date.now());
  const [stepOpen, setStepOpen] = useState<BreachStepKey | null>(null);
  const [affected, setAffected] = useState(b.affected === null ? "" : String(b.affected));
  const hours = Math.floor((new Date(b.deadlineAt).getTime() - now) / 3_600_000);
  const isOpen = b.status === "open";
  const patch = async (body: Record<string, unknown>, key: string) => {
    const res = await run(adminEndpoints.privacyBreach(b.id), { method: "PATCH", body: { ...body, version: b.version } }, { key, success: t("saved"), refresh: false, onReload: onSaved });
    if (res.ok) onSaved();
    return res.ok;
  };
  const stepOf = (k: BreachStepKey) => b.steps.find((s) => s.key === k);
  const allDone = STEP_KEYS.every((k) => stepOf(k)?.doneAt);
  return (
    <Panel
      title={
        <>
          <span className={styles.mono}>{b.ref}</span> · {b.title}
        </>
      }
      badge={
        <Pill tone={isOpen ? "pink" : "green"} icon={isOpen ? "triangle-alert" : "circle-check"}>
          {t(`breach_${b.status}`)}
        </Pill>
      }
    >
      {b.details ? <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{b.details}</p> : null}
      {isOpen ? (
        <div className={`${p.clock} ${hours < 24 ? p.hot : ""}`}>
          <Icon name="timer" size={20} />
          <span className={p.clockT}>
            <b className={p.clockBig}>{hours >= 0 ? t("hoursLeft", { count: hours }) : t("hoursOver", { count: -hours })}</b>
            <span>{t("boardNotice", { at: formatDate(b.discoveredAt, locale) })}</span>
          </span>
        </div>
      ) : null}
      <ol className={p.checklist}>
        {STEP_KEYS.map((k) => {
          const s = stepOf(k);
          const done = !!s?.doneAt;
          return (
            <li key={k}>
              <span className={done ? p.chkDone : p.chkPend}>
                <Icon name={done ? "circle-check" : "clock"} size={18} />
              </span>
              <span>
                {t(`bstep_${k}`)}
                {done && s ? (
                  <span className={styles.cap}>
                    {" "}
                    · {formatDate(s.doneAt!, locale)}
                    {s.by ? ` · ${s.by}` : ""}
                  </span>
                ) : null}
                {s?.note ? <span className={p.stepNote} style={{ display: "block" }}>{s.note}</span> : null}
              </span>
              {can && isOpen ? (
                done ? (
                  <Button variant="ghost" size="sm" pending={pending === `s-${k}`} onClick={() => patch({ step: { key: k, done: false } }, `s-${k}`)}>
                    {t("undo")}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setStepOpen(k)}>
                    {t("markDone")}
                  </Button>
                )
              ) : (
                <span />
              )}
            </li>
          );
        })}
      </ol>
      {can && isOpen ? (
        <div className={styles.row} style={{ alignItems: "flex-end" }}>
          <Input label={t("affected")} optional inputMode="numeric" value={affected} onChange={(e) => setAffected(e.target.value.replace(/\D/g, "").slice(0, 7))} />
          <Button variant="outline" pending={pending === "affected"} disabled={affected === (b.affected === null ? "" : String(b.affected))} onClick={() => patch({ affected: affected === "" ? null : Number(affected) }, "affected")}>
            {t("save")}
          </Button>
          <Button variant="secondary" disabled={!allDone} pending={pending === "close"} onClick={() => patch({ status: "closed" }, "close")}>
            {t("closeBreach")}
          </Button>
        </div>
      ) : b.affected !== null ? (
        <span className={styles.cap}>{t("affectedN", { count: b.affected })}</span>
      ) : null}
      {stepOpen ? <StepDialog step={stepOpen} onClose={() => setStepOpen(null)} onSave={async (note) => { const ok = await patch({ step: { key: stepOpen, done: true, ...(note ? { note } : {}) } }, `s-${stepOpen}`); if (ok) setStepOpen(null); }} /> : null}
    </Panel>
  );
}

function StepDialog({ step, onClose, onSave }: { step: BreachStepKey; onClose: () => void; onSave: (note: string) => void }) {
  const t = useTranslations("admin.privacy");
  const [note, setNote] = useState("");
  return (
    <Dialog
      open
      onClose={onClose}
      title={t(`bstep_${step}`)}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={() => onSave(note.trim())}>{t("markDone")}</Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Textarea label={t("stepNote")} optional rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Dialog>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const t = useTranslations("admin.privacy");
  const { run, pending } = useAction();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async () => {
    if (title.trim().length < 3) return setErrors({ title: t("errTitle") });
    const res = await run<Breach>(adminEndpoints.privacyBreaches(), { body: { title: title.trim(), details: details.trim() } }, { key: "create", success: t("breachStarted"), quiet422: true, refresh: false });
    if (res.ok) onCreated(res.data.id);
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("startBreach")}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "create"} onClick={save}>
            {t("start")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <Alert tone="attention">{t("breachClock")}</Alert>
        {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
        <Input label={t("breachTitle")} value={title} error={errors.title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label={t("breachDetails")} optional rows={4} maxLength={4000} value={details} error={errors.details} onChange={(e) => setDetails(e.target.value)} />
      </div>
    </Dialog>
  );
}

function DpoPanel({ overview, onSaved }: { overview: PrivacyOverview; onSaved: () => void }) {
  const t = useTranslations("admin.privacy");
  const { run, pending } = useAction();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(overview.dpo.name ?? "");
  const [contact, setContact] = useState(overview.dpo.contact ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = async () => {
    const res = await run(adminEndpoints.privacyDpo(), { method: "PATCH", body: { name: name.trim() || null, contact: contact.trim() || null } }, { key: "dpo", success: t("saved"), quiet422: true, refresh: false });
    if (res.ok) {
      setEdit(false);
      onSaved();
    } else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };
  return (
    <Panel
      title={t("dpoTitle")}
      action={
        overview.can.editDpo ? (
          <button type="button" className={styles.linkBtn} onClick={() => setEdit(true)}>
            {t("edit")}
          </button>
        ) : undefined
      }
    >
      <div className={styles.row} style={{ gap: 10, flexWrap: "nowrap" }}>
        <span className={p.dpoAv} aria-hidden="true">
          {overview.dpo.name ? overview.dpo.name.slice(0, 1) : "?"}
        </span>
        <span className={styles.stack} style={{ gap: 0 }}>
          <b className={styles.strong}>{overview.dpo.name ?? t("dpoNone")}</b>
          <span className={styles.cap}>{overview.dpo.name ? (overview.dpo.contact ?? "") : t("dpoNoneNote")}</span>
        </span>
      </div>
      {edit ? (
        <Dialog
          open
          onClose={() => setEdit(false)}
          title={t("dpoTitle")}
          footer={
            <div className={styles.dialogFoot}>
              <Button variant="ghost" onClick={() => setEdit(false)}>
                {t("cancel")}
              </Button>
              <Button pending={pending === "dpo"} onClick={save}>
                {t("save")}
              </Button>
            </div>
          }
        >
          <div className={styles.dialogBody}>
            {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
            <Input label={t("dpoName")} value={name} error={errors.name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            <Input label={t("dpoContact")} optional value={contact} error={errors.contact} maxLength={200} onChange={(e) => setContact(e.target.value)} />
          </div>
        </Dialog>
      ) : null}
    </Panel>
  );
}
