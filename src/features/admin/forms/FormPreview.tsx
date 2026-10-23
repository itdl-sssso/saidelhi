"use client";

// Phone-frame preview of a form definition (spec 30 "Preview", spec 31 top bar): uses the same field
// renderer as /f/<token>, with local answers and no network. EN/HI switch inside the frame.
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { FormDefinition } from "@/contract";
import { SectionFields, type RenderCtx } from "@/features/formlink/ui/FieldRenderer";
import { groupIssues, pick, scopeOf, validateLocal, type Lang } from "@/features/formlink/model";
import type { AppLocale } from "@/lib/format";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import s from "./Forms.module.css";

const NO_FILES = { items: () => [], add: () => {}, reject: () => {}, remove: () => {}, retry: () => {} };

/** The form as a coordinator sees it, driven by local answers (no network). */
export function FormFill({ def, lang, answers, setAnswers }: { def: FormDefinition; lang: Lang; answers: Record<string, unknown>; setAnswers: (fn: (a: Record<string, unknown>) => Record<string, unknown>) => void }) {
  const validation = useMemo(() => validateLocal(def, answers), [def, answers]);
  const issues = useMemo(() => groupIssues(def, validation), [def, validation]);
  const ctx: RenderCtx = {
    def,
    lang,
    answers,
    scope: scopeOf(def, answers),
    issues,
    serverErrors: {},
    showErrors: () => false,
    touch: () => {},
    set: (path, v) => setAnswers((a) => ({ ...a, [path]: v })),
    files: NO_FILES,
    fileNotes: {},
    disabled: false,
    locale: lang,
  };
  return (
    <>
      {def.sections.map((sec) => (
        <section key={sec.id} className={s.phoneSec}>
          <h3 className={s.phoneSecT}>{pick(sec.title, lang) || "—"}</h3>
          <SectionFields section={sec} ctx={ctx} />
        </section>
      ))}
    </>
  );
}

export function PhonePreview({ def, initialLang }: { def: FormDefinition; initialLang?: Lang }) {
  const t = useTranslations("admin.forms");
  const locale = useLocale() as AppLocale;
  const [lang, setLang] = useState<Lang>(initialLang ?? locale);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  return (
    <div className={s.phoneWrap}>
      <div className={s.langSwitch} role="group" aria-label={t("previewLang")}>
        {(["en", "hi"] as const).map((l) => (
          <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
            {l === "en" ? "EN" : "हिं"}
          </button>
        ))}
      </div>
      <div className={s.phone} lang={lang}>
        <div className={s.phoneBar}>{pick(def.title, lang)}</div>
        <div className={s.phoneBody}>
          <FormFill def={def} lang={lang} answers={answers} setAnswers={setAnswers} />
        </div>
      </div>
      <p className={s.cap}>{t("previewNote")}</p>
    </div>
  );
}

export function PreviewDialog({ open, onClose, def }: { open: boolean; onClose: () => void; def: FormDefinition | null }) {
  const t = useTranslations("admin.forms");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("preview")}
      width={440}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
        </div>
      }
    >
      {def ? <PhonePreview def={def} /> : <p>{t("noDefinition")}</p>}
    </Dialog>
  );
}
