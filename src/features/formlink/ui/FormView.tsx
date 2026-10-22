"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { AnswerMap, FormPayload, LinkInfo } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { ProgressBar } from "@/ui/ProgressBar";
import { SaveStatus, type SaveState } from "@/ui/SaveStatus";
import { SkeletonCard } from "@/ui/Skeleton";
import { useToast } from "@/ui/Toast";
import { Icon } from "@/ui/Icon";
import { classifyFailure, dueEntries, sendEntry, type SendOutcome } from "../outbox";
import {
  type Draft,
  draftKeyOf,
  initialDraft,
  markSent,
} from "../store";
import {
  errorPathsInSection,
  groupIssues,
  hasReviewStep,
  payloadAnswers,
  pick,
  pruneBlankRows,
  rootOf,
  scopeOf,
  sectionIndexById,
  sectionsWithErrors,
  setAnswer,
  stepCount,
  validateLocal,
} from "../model";
import { fieldDomId, SectionFields, type RenderCtx } from "./FieldRenderer";
import { EventSummary } from "./EventSummary";
import { GoneView, type GoneKind } from "./GoneView";
import { ReviewSummary } from "./ReviewSummary";
import { formPaths, useLink, useOnline } from "./runtime";
import { useUploads } from "./useUploads";
import styles from "./formlink.module.css";

type View =
  | { k: "loading" }
  | { k: "failed"; offline: boolean }
  | { k: "gone"; kind: GoneKind; link: LinkInfo | null }
  | { k: "ready"; payload: FormPayload };

type Notice =
  | null
  | { tone: "error" | "attention" | "info"; text: string; conflict?: boolean; stale?: boolean };

type QueueState = "idle" | "sending" | "queued" | "error";

export function FormView({ token }: { token: string }) {
  const t = useTranslations("formlink");
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { api, store, linkKey, locale } = useLink(token);
  const paths = formPaths(token);

  const [view, setView] = useState<View>({ k: "loading" });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!store || !linkKey) return;
    let live = true;
    void (async () => {
      const r = await api.form();
      if (!live) return;
      if (r.ok) {
        void store.savePayload(linkKey, locale, r.data, new Date());
        return setView({ k: "ready", payload: r.data });
      }
      if (r.status === 401) return router.replace(`${paths.verify}?expired=1`);
      if (r.status === 0) {
        const cached = await store.getPayload(linkKey, locale);
        if (cached && live) return setView({ k: "ready", payload: cached.payload });
        return setView({ k: "failed", offline: true });
      }
      if (r.status === 404) return setView({ k: "gone", kind: "not_found", link: null });
      if (r.status === 410) {
        const c = classifyFailure(r);
        const kind = c.error.code === "LINK_REVOKED" ? "revoked" : c.error.code === "LINK_USED_UP" ? "used_up" : "expired";
        return setView({ k: "gone", kind, link: (c.error.details as { link?: LinkInfo } | undefined)?.link ?? null });
      }
      setView({ k: "failed", offline: false });
    })();
    return () => {
      live = false;
    };
  }, [api, store, linkKey, locale, reload, router, paths.verify]);

  if (view.k === "loading" || !store || !linkKey) return <div className={styles.page} aria-busy="true" aria-label={t("loading")}><SkeletonCard /></div>;
  if (view.k === "gone") return <GoneView kind={view.kind} link={view.link} />;
  if (view.k === "failed") {
    return (
      <div className={styles.page}>
        <Alert tone={view.offline ? "attention" : "error"}>{view.offline ? t("offlineVerify") : t("genericError")}</Alert>
        <Button variant="outline" icon="refresh-cw" onClick={() => setReload((n) => n + 1)}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  return <FormSession key={`${view.payload.definition.id}:${view.payload.definition.version}`} token={token} payload={view.payload} online={online} toast={toast} onReloadPayload={() => setReload((n) => n + 1)} />;
}

function FormSession({
  token,
  payload,
  online,
  toast,
  onReloadPayload,
}: {
  token: string;
  payload: FormPayload;
  online: boolean;
  toast: ReturnType<typeof useToast>;
  onReloadPayload: () => void;
}) {
  const t = useTranslations("formlink");
  const router = useRouter();
  const { api, store, linkKey, locale } = useLink(token);
  const def = payload.definition;
  const paths = formPaths(token);
  const reviewStep = hasReviewStep(def);
  const total = stepCount(def);

  // ---- Draft state ----------------------------------------------------------------
  const first = useRef<{ draft: Draft; stale: boolean } | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const answersRef = useRef<AnswerMap>({});
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [ready, setReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"fill" | "summary">("fill");
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [queueState, setQueueState] = useState<QueueState>("idle");
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const [gone, setGone] = useState<{ kind: GoneKind; link: LinkInfo | null } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pumping = useRef(false);
  const pumpRef = useRef<() => Promise<void>>(async () => {});
  const pump = useCallback(() => pumpRef.current(), []);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!store || !linkKey || draftRef.current) return;
    let live = true;
    void (async () => {
      const stored = await store.getDraft(draftKeyOf(linkKey, def));
      const init = initialDraft({ linkKey, payload, stored, now: new Date() });
      if (!live) return;
      first.current = { draft: init.draft, stale: init.stale };
      draftRef.current = init.draft;
      answersRef.current = init.draft.answers;
      setAnswers(init.draft.answers);
      setDirty(init.draft.dirty);
      setSentAt(init.draft.sentAt);
      const pending = await store.pending(linkKey);
      if (pending.length) setQueueState("queued");
      setStep(Math.min(init.draft.sectionIndex, total - 1));
      setMode(init.draft.sentAt && !init.draft.dirty && pending.length === 0 ? "summary" : "fill");
      if (init.stale) setNotice({ tone: "attention", text: t("staleNote"), stale: true });
      if (!stored) await store.saveDraft(init.draft);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [store, linkKey, def, payload, total, t]);

  const saveNow = useCallback(async () => {
    const d = draftRef.current;
    if (!d || !store) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    await store.saveDraft({ ...d, answers: answersRef.current, updatedAt: new Date().toISOString() });
  }, [store]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveNow(), 400);
  }, [saveNow]);

  useEffect(() => {
    const flush = () => void saveNow();
    const vis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", vis);
      flush();
    };
  }, [saveNow]);

  const commit = useCallback(
    (next: AnswerMap, patch?: Partial<Draft>) => {
      answersRef.current = next;
      if (draftRef.current) draftRef.current = { ...draftRef.current, ...patch, answers: next, dirty: true };
      setAnswers(next);
      setDirty(true);
      scheduleSave();
    },
    [scheduleSave],
  );

  // ---- Validation ---------------------------------------------------------------------
  const validation = useMemo(() => validateLocal(def, answers), [def, answers]);
  const issues = useMemo(() => groupIssues(def, validation), [def, validation]);
  const sectionOf = useMemo(() => sectionIndexById(def), [def]);
  const scope = useMemo(() => scopeOf(def, answers), [def, answers]);
  const errSections = useMemo(() => sectionsWithErrors(def, validation.errors), [def, validation.errors]);

  const showErrors = useCallback(
    (path: string) => {
      const s = sectionOf.get(rootOf(path));
      return (s !== undefined && attempted.has(s)) || touched.has(path) || touched.has(rootOf(path));
    },
    [attempted, touched, sectionOf],
  );

  // ---- Uploads ---------------------------------------------------------------------------
  const uploads = useUploads({
    api,
    store,
    linkKey,
    online,
    locale,
    answersRef,
    draftRef,
    commit,
  });

  // ---- Sending ---------------------------------------------------------------------------
  const goStep = useCallback(
    (n: number) => {
      const i = Math.max(0, Math.min(total - 1, n));
      setStep(i);
      if (draftRef.current) draftRef.current = { ...draftRef.current, sectionIndex: i };
      scheduleSave();
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0 });
        headingRef.current?.focus();
      });
    },
    [total, scheduleSave],
  );

  const applyOutcome = useCallback(
    async (out: SendOutcome): Promise<void> => {
      if (!store) return;
      switch (out.kind) {
        case "sent": {
          const d = markSent(draftRef.current!, out.submission, out.entry.answers, new Date());
          draftRef.current = { ...d, answers: answersRef.current };
          await store.saveDraft(draftRef.current);
          setDirty(draftRef.current.dirty);
          setSentAt(draftRef.current.sentAt);
          setQueueState("idle");
          setNotice(null);
          if (!draftRef.current.dirty) router.push(paths.done);
          return;
        }
        case "deferred": {
          setQueueState("queued");
          const wait = Math.max(1000, out.retryAt.getTime() - Date.now());
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => void pumpRef.current(), wait);
          return;
        }
        case "auth":
          await saveNow();
          router.replace(`${paths.verify}?expired=1`);
          return;
        case "invalid": {
          setQueueState("idle");
          const errs: Record<string, string> = {};
          for (const [p, m] of Object.entries(out.fields)) errs[p] = m;
          setServerErrors(errs);
          const keys = Object.keys(errs);
          const sections = new Set(keys.map((k) => sectionOf.get(rootOf(k))).filter((x): x is number => x !== undefined));
          setAttempted((a) => new Set([...a, ...sections]));
          setNotice({ tone: "error", text: out.message || t("invalidTitle") });
          setMode("fill");
          if (keys.length) {
            const target = [...keys].sort((a, b) => (sectionOf.get(rootOf(a)) ?? 0) - (sectionOf.get(rootOf(b)) ?? 0))[0];
            goStep(sectionOf.get(rootOf(target)) ?? 0);
            setFocusPath(target);
          }
          return;
        }
        case "conflict":
          setQueueState("idle");
          if (out.entry.kind === "create") {
            // Not a version clash: the server refused the send (event closed, report already sent…).
            setNotice({ tone: "error", text: out.message || t("genericError") });
            return;
          }
          setNotice({ tone: "attention", text: t("conflictBody"), conflict: true });
          toast.show({ tone: "info", message: t("conflictTitle") });
          return;
        case "gone":
          setQueueState("idle");
          setGone({ kind: out.code === "LINK_REVOKED" ? "revoked" : out.code === "LINK_USED_UP" ? "used_up" : out.code === "NOT_FOUND" ? "not_found" : "expired", link: out.link });
          return;
        case "file-failed":
          setQueueState("error");
          setNotice({ tone: "error", text: out.message });
          return;
        case "failed":
          setQueueState("error");
          setNotice({ tone: "error", text: out.message || t("genericError") });
          return;
      }
    },
    [store, router, paths.done, paths.verify, sectionOf, goStep, saveNow, t, toast],
  );

  useEffect(() => {
    pumpRef.current = async () => {
    if (!store || !linkKey || pumping.current) return;
    pumping.current = true;
    try {
      const due = await dueEntries(store, linkKey, new Date());
      if (!due.length) return;
      setQueueState("sending");
      for (const entry of due) {
        const out = await sendEntry(entry, {
          store,
          now: () => new Date(),
          api: {
            create: api.create,
            patch: api.patch,
            upload: (file, name, fieldId, key) => api.upload(file, name, fieldId, key),
            current: async () => {
              const r = await api.form();
              return r.ok ? r.data.existing : null;
            },
          },
          onFileUploaded: (localKey, att) => uploads.onOfflineFileUploaded(localKey, att),
        });
        await applyOutcome(out);
        if (out.kind !== "sent") break;
      }
    } finally {
      pumping.current = false;
    }
    };
  });

  // Resume the queue on load, on reconnect and every so often while something is waiting.
  useEffect(() => {
    if (ready && online) void pump();
  }, [ready, online, pump]);
  useEffect(() => {
    if (queueState !== "queued") return;
    const id = setInterval(() => void pump(), 20_000);
    return () => clearInterval(id);
  }, [queueState, pump]);
  useEffect(() => () => void (retryTimer.current && clearTimeout(retryTimer.current)), []);

  const submit = async () => {
    if (!store || !draftRef.current) return;
    const v = validateLocal(def, answersRef.current);
    if (v.errors.length) {
      setAttempted(new Set(def.sections.map((_, i) => i)));
      const bad = sectionsWithErrors(def, v.errors);
      const firstBad = Math.min(...bad);
      setNotice({ tone: "error", text: t("errorsSend") });
      setMode("fill");
      goStep(firstBad);
      setFocusPath(errorPathsInSection(def, firstBad, v.errors)[0] ?? null);
      return;
    }
    setNotice(null);
    setServerErrors({});
    const pruned = pruneBlankRows(def, answersRef.current);
    answersRef.current = pruned;
    setAnswers(pruned);
    draftRef.current = { ...draftRef.current, answers: pruned, dirty: true };
    await store.saveDraft(draftRef.current);
    await store.enqueue(draftRef.current, payloadAnswers(def, pruned), new Date());
    setQueueState(online ? "sending" : "queued");
    await pump();
  };

  const reloadLatest = async (keepMine: boolean) => {
    const r = await api.form();
    if (!r.ok || !r.data.existing || !draftRef.current || !store) return onReloadPayload();
    const ex = r.data.existing;
    if (keepMine) {
      draftRef.current = { ...draftRef.current, submissionId: ex.id, submissionVersion: ex.version };
      await store.saveDraft(draftRef.current);
      setNotice(null);
      return;
    }
    await store.deleteDraft(draftRef.current.key);
    await store.dequeue(draftRef.current.key);
    onReloadPayload();
  };

  // ---- Step navigation -------------------------------------------------------------------
  const next = () => {
    const errs = errorPathsInSection(def, step, validation.errors);
    if (errs.length) {
      setAttempted((a) => new Set([...a, step]));
      setFocusPath(errs[0]);
      return;
    }
    goStep(step + 1);
  };

  useEffect(() => {
    if (!focusPath) return;
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(fieldDomId(focusPath)) ?? document.querySelector<HTMLElement>(`[data-field="${fieldDomId(focusPath)}"]`);
      const target = el?.matches("input,select,textarea,button") ? el : el?.querySelector<HTMLElement>("input,select,textarea,button");
      (target ?? el)?.focus({ preventScroll: false });
      (target ?? el)?.scrollIntoView({ block: "center", behavior: "smooth" });
      setFocusPath(null);
    });
    return () => cancelAnimationFrame(id);
  }, [focusPath, step]);

  // ---- Render --------------------------------------------------------------------------------
  const ctx: RenderCtx = {
    def,
    lang: locale,
    answers,
    scope,
    issues,
    serverErrors,
    showErrors,
    touch: (p) => setTouched((s) => (s.has(p) ? s : new Set(s).add(p))),
    set: (p, v) => {
      if (typeof v !== "string" && typeof v !== "number") setTouched((s) => new Set(s).add(p));
      setServerErrors((e) => {
        if (!(p in e)) return e;
        const rest = { ...e };
        delete rest[p];
        return rest;
      });
      commit(setAnswer(answersRef.current, p, v));
    },
    files: uploads.handlers,
    fileNotes: uploads.notes,
    disabled: !payload.editable || mode === "summary",
    locale,
  };

  if (gone) return <GoneView kind={gone.kind} link={gone.link} />;
  if (!ready) return <div className={styles.page} aria-busy="true" aria-label={t("loading")}><SkeletonCard /></div>;

  const sent = !!sentAt && !dirty && queueState === "idle";
  const saveState: SaveState = queueState === "sending" ? "sending" : queueState === "queued" ? "queued" : queueState === "error" ? "error" : sent ? "sent" : "local";
  const saveText = { sending: t("saveSending"), queued: t("saveQueued"), error: t("saveError"), sent: t("saveSent"), local: t("saveLocal") }[saveState];
  const title = pick(def.title, locale);
  const onReview = reviewStep && step === def.sections.length;
  const section = onReview ? null : def.sections[step];
  const lastFill = !reviewStep && step === def.sections.length - 1;
  const busy = queueState === "sending";

  return (
    <div>
      <div className={styles.formHead}>
        <p className={styles.formTitle}>{title}</p>
        {mode === "fill" ? (
          <ProgressBar
            sticky={false}
            value={((step + 1) / total) * 100}
            label={t("progress")}
            caption={t("step", { n: step + 1, total, title: onReview ? t("stepReview") : pick(section!.title, locale) })}
            trailing=""
          />
        ) : null}
        <div className={styles.statusRow} aria-live="polite">
          <SaveStatus state={saveState}>{saveText}</SaveStatus>
          {queueState === "queued" && online ? (
            <Button type="button" variant="quiet" size="sm" onClick={() => void pump()}>
              {t("retryNow")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className={styles.section}>
        {!online ? <Alert tone="attention">{t("offlineBanner")}</Alert> : null}
        {notice ? (
          <Alert tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
            <div className={styles.stack} style={{ gap: 8 }}>
              <span>{notice.text}</span>
              {notice.conflict || notice.stale ? (
                <div className={styles.row}>
                  <Button type="button" size="sm" variant="outline" onClick={() => void reloadLatest(false)}>
                    {t("conflictReload")}
                  </Button>
                  <Button type="button" size="sm" variant="quiet" onClick={() => void reloadLatest(true)}>
                    {t("keepMine")}
                  </Button>
                </div>
              ) : null}
            </div>
          </Alert>
        ) : null}

        {mode === "summary" ? (
          <>
            <h1 className={styles.sectionTitle} tabIndex={-1} ref={headingRef}>
              {payload.purpose === "public" ? t("sentTitlePublic") : t("sentTitle")}
            </h1>
            <p className={styles.lead}>{!payload.editable ? t("approvedNote") : payload.purpose === "public" ? t("sentHelpPublic") : t("sentHelp")}</p>
            <EventSummary event={payload.event} />
            <ReviewSummary def={def} answers={answers} locale={locale} />
            <div className={styles.stack}>
              {payload.editable ? (
                <Button type="button" size="lg" icon="pencil" onClick={() => { setMode("fill"); goStep(0); }} fullWidth>
                  {payload.purpose === "public" ? t("editSignup") : t("editReport")}
                </Button>
              ) : null}
              <Button href={paths.done} variant="outline" fullWidth>
                {t("viewDone")}
              </Button>
            </div>
          </>
        ) : onReview ? (
          <>
            <h1 className={styles.sectionTitle} tabIndex={-1} ref={headingRef}>
              {t("review")}
            </h1>
            <p className={styles.lead}>{t("reviewHelp")}</p>
            {errSections.size ? <Alert tone="error">{t("errorsSend")}</Alert> : null}
            <ReviewSummary def={def} answers={answers} locale={locale} onChange={goStep} sectionsWithErrors={errSections} />
          </>
        ) : section ? (
          <>
            <h1 className={styles.sectionTitle} tabIndex={-1} ref={headingRef}>
              {pick(section.title, locale)}
            </h1>
            {step === 0 && !payload.existing ? <EventSummary event={payload.event} /> : null}
            {attempted.has(step) && errorPathsInSection(def, step, validation.errors).length ? (
              <Alert tone="error" role="alert">
                {t("errorsHere", { n: new Set(errorPathsInSection(def, step, validation.errors)).size })}
              </Alert>
            ) : null}
            {section.personalData ? (
              <div className={styles.personal} role="group" aria-label={t("personalSection")}>
                <span className={styles.personalBadge}>
                  <Icon name="shield-check" size={16} /> {t("personalBadge")}
                </span>
                <p className={styles.lead}>{payload.purpose === "public" ? t("personalNotePublic") : t("personalNote")}</p>
                <SectionFields section={section} ctx={{ ...ctx, inPersonal: true }} />
              </div>
            ) : (
              <SectionFields section={section} ctx={ctx} />
            )}
          </>
        ) : null}
      </div>

      {mode === "fill" ? (
        <div className={styles.nav}>
          {step > 0 ? (
            <Button type="button" variant="outline" size="lg" icon="arrow-left" className={styles.navBack} onClick={() => goStep(step - 1)} aria-label={t("back")} />
          ) : null}
          {onReview || lastFill ? (
            <Button type="button" size="lg" icon="send" pending={busy} onClick={() => void submit()} disabled={!payload.editable}>
              {busy ? t("sending") : sentAt ? t("saveChanges") : payload.purpose === "public" ? t("sendPublic") : t("send")}
            </Button>
          ) : (
            <Button type="button" size="lg" iconAfter="arrow-right" onClick={next}>
              {t("next")}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
