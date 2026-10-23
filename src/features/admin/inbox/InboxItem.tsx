"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { type InboxDetail, type InboxPatchBody, adminEndpoints } from "@/contract";
import { Link, useRouter } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { type FieldMark, SectionFields, type RenderCtx } from "@/features/formlink/ui/FieldRenderer";
import { groupIssues, scopeOf, validateLocal } from "@/features/formlink/model";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Select } from "@/ui/Select";
import { SkeletonCard } from "@/ui/Skeleton";
import { ReasonDialog } from "../Dialogs";
import { PageHead } from "../kit";
import { fmtDateTime, fmtShortDateTime } from "../time";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { fixtureDetail } from "./__fixtures__";
import { ConfPill } from "./parts";
import { SourcePane } from "./SourcePane";
import styles from "../Admin.module.css";
import s from "./Inbox.module.css";

const NO_FILES = { items: () => [], add: () => {}, reject: () => {}, remove: () => {}, retry: () => {} };

export function InboxItem({ id }: { id: string }) {
  const t = useTranslations("admin.inbox");
  const api = useApi<InboxDetail>(adminEndpoints.inboxItem(id), () => ({ data: fixtureDetail(id) }));
  if (api.status === "loading") return <SkeletonCard />;
  if (api.status === "forbidden") return <EmptyState icon="lock" title={t("forbidden")} />;
  if (api.status === "notFound") return <EmptyState icon="search-x" title={t("notFound")} action={<Button href="/admin/inbox" variant="outline">{t("backToList")}</Button>} />;
  if (api.status === "error") return <EmptyState icon="cloud-off" title={t("loadError")} action={<button type="button" className={styles.linkBtn} onClick={api.reload}>{t("retry")}</button>} />;
  return <Loaded key={`${api.data.id}:${api.data.version}`} d={api.data} reload={api.reload} />;
}

type Dialog = "reject" | "ask" | "escalate" | null;

function Loaded({ d, reload }: { d: InboxDetail; reload: () => void }) {
  const t = useTranslations("admin.inbox");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { run, pending } = useAction();
  const [answers, setAnswers] = useState<Record<string, unknown>>(d.draft.answers);
  const [pane, setPane] = useState<"source" | "draft">("source");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const eventId = d.matchedEvent?.id ?? null;
  const dirty = JSON.stringify(answers) !== JSON.stringify(d.draft.answers);
  const def = d.definition;

  const marks = useMemo(() => {
    const out: Record<string, FieldMark> = {};
    for (const [k, v] of Object.entries(d.draft.fieldConfidence)) {
      if (v.level === "high") continue;
      out[k] = { level: v.level, label: t(`mark.${v.level}`), whyLabel: t("why"), why: v.why ? tx(v.why, locale) : null };
    }
    return out;
  }, [d.draft.fieldConfidence, locale, t]);
  const flagged = Object.keys(marks).length;

  const validation = useMemo(() => (def ? validateLocal(def, answers) : null), [def, answers]);
  const issues = useMemo(() => (def && validation ? groupIssues(def, validation) : new Map()), [def, validation]);

  const ctx: RenderCtx | null = def
    ? {
        def,
        lang: locale,
        answers: answers as RenderCtx["answers"],
        scope: scopeOf(def, answers as RenderCtx["answers"]),
        issues,
        serverErrors,
        showErrors: () => attempted,
        touch: () => {},
        set: (path, v) => {
          setServerErrors((e) => {
            if (!(path in e)) return e;
            const rest = { ...e };
            delete rest[path];
            return rest;
          });
          setAnswers((a) => ({ ...a, [path]: v }));
        },
        files: NO_FILES,
        fileNotes: {},
        disabled: !d.can.edit,
        locale,
        marks,
      }
    : null;

  const opts = (key: string, success?: string) => ({ key, success, refresh: false, quiet422: true, devFixture: true, onReload: reload });

  const patch = async (body: Omit<InboxPatchBody, "version">, key: string, success?: string) => {
    const res = await run(adminEndpoints.inboxItem(d.id), { method: "PATCH", body: { version: d.version, ...body } }, opts(key, success));
    if (res.ok) reload();
    return res.ok;
  };

  const approve = async () => {
    setAttempted(true);
    if (!eventId || !validation || validation.errors.length > 0) return;
    const res = await run(adminEndpoints.inboxAction(d.id, "approve"), { body: { version: d.version, eventId, answers } }, opts("approve", t("done.approved")));
    if (res.ok) router.push("/admin/inbox");
    else if (res.status === 422 && res.error.fields) setServerErrors(res.error.fields);
  };

  const decide = (action: "reject" | "escalate" | "ask", field: "reason" | "note" | "question", success: string, leave: boolean) => async (text: string) => {
    const res = await run(adminEndpoints.inboxAction(d.id, action), { body: { version: d.version, [field]: text || undefined } }, opts(action, success));
    if (!res.ok) return false;
    if (leave) router.push("/admin/inbox");
    else reload();
  };

  const errorCount = attempted ? (validation?.errors.length ?? 0) : 0;
  const title = t("itemTitle", { source: t(`source.${d.source}`), sender: d.sender });

  return (
    <div className={styles.page}>
      <PageHead
        back={{ href: "/admin/inbox", label: t("title") }}
        title={title}
        sub={t("received", { at: fmtDateTime(d.receivedAt, locale) })}
        actions={<ConfPill level={d.confidence} />}
      />

      <div className={`${styles.tabs} ${s.paneTabs}`} role="group" aria-label={t("panes")}>
        <button type="button" className={styles.tab} aria-pressed={pane === "source"} onClick={() => setPane("source")}>
          <Icon name="message-circle" size={16} />
          {t("pane.source")}
        </button>
        <button type="button" className={styles.tab} aria-pressed={pane === "draft"} onClick={() => setPane("draft")}>
          <Icon name="file-pen-line" size={16} />
          {t("pane.draft")}
          {flagged ? <span className={styles.tabCountHot}>{flagged}</span> : null}
        </button>
      </div>

      <div className={s.split}>
        <section className={s.pane} data-active={pane === "source"} aria-label={t("pane.source")}>
          <div className={s.paneHd}>
            <span className={s.lbl}>{t("pane.source")}</span>
            <span className={styles.cap}>{t(`sourceKind.${d.thread.length ? "thread" : d.raw.kind}`)}</span>
          </div>
          <div className={s.paneBd}>
            <SourcePane d={d} />
          </div>
        </section>

        <section className={s.pane} data-active={pane === "draft"} aria-label={t("pane.draft")}>
          <div className={s.paneHd}>
            <span className={s.lbl}>{t("pane.draft")}</span>
            <span className={styles.cap}>{flagged ? t("toCheck", { n: flagged }) : t("nothingToCheck")}</span>
          </div>
          <div className={s.paneBd}>
            <div className={s.draft}>
              <Select
                label={t("match.label")}
                hint={t("match.hint")}
                value={eventId ?? ""}
                disabled={!d.can.edit || pending === "match"}
                placeholder={t("noEvent")}
                options={[
                  ...(d.matchedEvent && !d.candidates.some((c) => c.id === d.matchedEvent?.id) ? [d.matchedEvent] : []),
                  ...d.candidates,
                ].map((c) => ({ value: c.id, label: `${tx(c.title, locale)} · ${fmtShortDateTime(c.startsAt, locale)}` }))}
                onChange={(e) => void patch({ eventId: e.target.value || null, answers }, "match")}
              />
              {d.can.edit ? (
                <Link href="/admin/events/new" className={styles.textLink}>
                  {t("match.create")}
                </Link>
              ) : null}

              {ctx && def ? (
                <div className={s.form}>
                  {errorCount > 0 ? (
                    <Alert tone="error" title={t("fixErrors", { n: errorCount })}>
                      {t("fixErrorsBody")}
                    </Alert>
                  ) : null}
                  {def.sections.map((sec) => (
                    <div key={sec.id} className={s.sec}>
                      <h3 className={s.secT}>{tx(sec.title, locale)}</h3>
                      <SectionFields section={sec} ctx={ctx} />
                    </div>
                  ))}
                </div>
              ) : (
                <Alert tone="note">{t("match.needed")}</Alert>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={s.actbar}>
          {d.can.approve ? (
            <Button icon="check" pending={pending === "approve"} disabled={!eventId || !def} onClick={approve}>
              {t("action.approve")}
            </Button>
          ) : null}
          {d.can.edit ? (
            <Button variant="outline" icon="pencil" pending={pending === "save"} disabled={!dirty} onClick={() => void patch({ answers }, "save", t("done.saved"))}>
              {t("action.save")}
            </Button>
          ) : null}
          {d.can.ask ? (
            <Button variant="outline" icon="message-circle" onClick={() => setDialog("ask")}>
              {t("action.ask")}
            </Button>
          ) : null}
          <span className={s.grow} />
          {d.can.escalate ? (
            <Button variant="ghost" icon="arrow-up-right" onClick={() => setDialog("escalate")}>
              {t("action.escalate")}
            </Button>
          ) : null}
          {d.can.reject ? (
            <Button variant="ghost" icon="x" onClick={() => setDialog("reject")}>
              {t("action.reject")}
            </Button>
          ) : null}
        </div>
        {!eventId && d.can.approve ? <p className={s.hint}>{t("match.approveHint")}</p> : null}
        <p className={s.footNote}>
          <Icon name="user" size={16} />
          {d.aiDraftedAt ? t("footer", { at: fmtShortDateTime(d.aiDraftedAt, locale), model: d.aiModel ?? "" }) : t("footerPlain")}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="inbox-history">
        <header className={styles.cardHd}>
          <h2 className={styles.cardTitle} id="inbox-history">
            {t("history.title")}
          </h2>
        </header>
        <ol className={s.history}>
          {d.history.map((h, i) => (
            <li key={i}>
              <time dateTime={h.at}>{fmtShortDateTime(h.at, locale)}</time>
              <span>
                <b>{t(`history.${h.action}`)}</b> · {h.by.label}
                {h.note ? <span className={s.note}>{h.note}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <ReasonDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={t("reject.title")}
        body={<p>{t("reject.body")}</p>}
        label={t("reject.label")}
        confirmLabel={t("reject.confirm")}
        required
        pending={pending === "reject"}
        onSubmit={decide("reject", "reason", t("done.rejected"), true)}
      />
      <ReasonDialog
        open={dialog === "ask"}
        onClose={() => setDialog(null)}
        title={t("ask.title")}
        body={<p>{t("ask.body")}</p>}
        label={t("ask.label")}
        confirmLabel={t("ask.confirm")}
        required
        pending={pending === "ask"}
        onSubmit={decide("ask", "question", t("done.asked"), false)}
      />
      <ReasonDialog
        open={dialog === "escalate"}
        onClose={() => setDialog(null)}
        title={t("escalate.title")}
        body={<p>{t("escalate.body")}</p>}
        label={t("escalate.label")}
        confirmLabel={t("escalate.confirm")}
        pending={pending === "escalate"}
        onSubmit={decide("escalate", "note", t("done.escalated"), true)}
      />
    </div>
  );
}
