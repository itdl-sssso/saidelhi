"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AnswerMap, FormPayload } from "@/contract";
import { useRouter } from "@/i18n/navigation";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { SkeletonCard } from "@/ui/Skeleton";
import { type KeyNumber, keyNumbers } from "../model";
import { draftKeyOf } from "../store";
import { EventSummary } from "./EventSummary";
import { formPaths, useLink } from "./runtime";
import styles from "./formlink.module.css";

type State =
  | { k: "loading" }
  | { k: "none"; payload: FormPayload | null }
  | { k: "done"; payload: FormPayload; numbers: KeyNumber[]; queued: boolean; answers: AnswerMap };

/** Spec 21: "Report sent. Thank you." with the key numbers, what happens next, Edit report and Close. */
export function DoneView({ token }: { token: string }) {
  const t = useTranslations("formlink");
  const router = useRouter();
  const { api, store, linkKey, locale } = useLink(token);
  const paths = formPaths(token);
  const [state, setState] = useState<State>({ k: "loading" });

  useEffect(() => {
    if (!store || !linkKey) return;
    let live = true;
    void (async () => {
      const r = await api.form();
      if (!live) return;
      if (!r.ok && r.status === 401) return router.replace(`${paths.verify}?expired=1`);
      const payload = r.ok ? r.data : ((await store.getPayload(linkKey, locale))?.payload ?? null);
      if (!payload) return setState({ k: "none", payload: null });
      const draft = await store.getDraft(draftKeyOf(linkKey, payload.definition));
      const pending = (await store.pending(linkKey)).length > 0;
      const answers = draft?.answers ?? payload.existing?.answers ?? null;
      const sent = !!payload.existing || !!draft?.sentAt;
      if (!answers || (!sent && !pending)) return setState({ k: "none", payload });
      setState({ k: "done", payload, answers, queued: pending && !draft?.sentAt, numbers: keyNumbers(payload.definition, answers, locale) });
    })();
    return () => {
      live = false;
    };
  }, [api, store, linkKey, locale, router, paths.verify]);

  if (state.k === "loading") return <div className={styles.page} aria-busy="true" aria-label={t("loading")}><SkeletonCard /></div>;
  if (state.k === "none") {
    return (
      <div className={styles.page}>
        <Alert tone="note">{t("noDraft")}</Alert>
        <Button href={paths.form} fullWidth>
          {t("openForm")}
        </Button>
      </div>
    );
  }

  const { payload, numbers, queued } = state;
  const isPublic = payload.purpose === "public";
  return (
    <div className={styles.page}>
      <div className={styles.stack} style={{ alignItems: "flex-start" }}>
        <span className={styles.tick} aria-hidden="true">
          <Icon name={queued ? "cloud-off" : "circle-check-big"} size={24} />
        </span>
        <h1 className={styles.title} tabIndex={-1} id="done-title">
          {queued ? t("doneQueuedTitle") : isPublic ? t("donePublicTitle") : t("doneTitle")}
        </h1>
        <p className={styles.lead} style={{ fontSize: "var(--text-body-size)" }}>
          {queued ? t("doneQueuedBody") : isPublic ? t("donePublicBody") : null}
        </p>
      </div>
      <EventSummary event={payload.event} />
      {!isPublic && numbers.length ? (
        <section className={styles.stack} aria-labelledby="done-numbers">
          <h2 id="done-numbers" className={styles.subhead} style={{ margin: 0 }}>
            {t("doneNumbers")}
          </h2>
          <ul className={styles.numbers}>
            {numbers.map((n) => (
              <li key={n.id} className={styles.numCell}>
                <span className={styles.numValue}>{n.value.toLocaleString(locale === "hi" ? "hi-IN" : "en-IN")}</span>
                <span className={styles.numLabel}>{n.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!isPublic && !queued ? (
        <Alert tone="info" title={t("doneNext")}>
          {t("doneNextBody")}
        </Alert>
      ) : null}
      <div className={styles.stack}>
        {payload.editable ? (
          <Button href={paths.form} variant="outline" size="lg" icon="pencil" fullWidth>
            {isPublic ? t("editSignup") : t("editReport")}
          </Button>
        ) : null}
        <Button type="button" variant="quiet" fullWidth onClick={() => window.close()}>
          {t("close")}
        </Button>
        <p className={styles.lead} style={{ textAlign: "center" }}>
          {t("closeHint")}
        </p>
      </div>
    </div>
  );
}
