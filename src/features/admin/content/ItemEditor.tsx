"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { type ContentItemEditor, adminEndpoints } from "@/contract";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { DateField } from "@/ui/DateField";
import { Input } from "@/ui/Input";
import { I18nFields, type I18nValue, toI18n } from "../fields";
import { PageHead, Panel, Pill } from "../kit";
import { useAction } from "../useAction";
import { STATUS_TONE } from "./ContentPage";
import styles from "../Admin.module.css";
import c from "./Content.module.css";

const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const empty = (v: I18nValue): { en: string; hi: string | null } | null => (v.en.trim() ? { en: v.en.trim(), hi: v.hi?.trim() || null } : null);

/** Editor for announcements, home sections and (outside the calendar) thoughts. */
export function ItemEditor({ d, reload }: { d: ContentItemEditor; reload: () => void }) {
  const t = useTranslations("admin.content");
  const { run, pending } = useAction();
  const [title, setTitle] = useState<I18nValue>(toI18n(d.title));
  const [body, setBody] = useState<I18nValue>(toI18n(d.body));
  const [source, setSource] = useState<I18nValue>(toI18n(d.source));
  const [href, setHref] = useState(d.href ?? "");
  const [date, setDate] = useState(d.date ?? "");
  const [startsAt, setStartsAt] = useState(local(d.startsAt));
  const [endsAt, setEndsAt] = useState(local(d.endsAt));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isThought = d.type === "thought_for_day";
  const isAnn = d.type === "announcement";

  const save = async (status?: "published" | "hidden") => {
    const e: Record<string, string> = {};
    if (isThought ? !body.en.trim() : !title.en.trim() && !body.en.trim()) e.title = t("errText");
    if (isThought && !date) e.date = t("errDate");
    setErrors(e);
    if (Object.keys(e).length) return;
    const patch = {
      title: empty(title) ?? { en: "", hi: null },
      body: empty(body),
      source: empty(source),
      href: href.trim() || null,
      date: date || null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      ...(status ? { status } : {}),
      version: d.version,
    };
    const res = await run(adminEndpoints.contentItem(d.id), { method: "PATCH", body: patch }, { key: status ?? "save", success: t("saved"), quiet422: true, onReload: reload });
    if (res.ok) reload();
    else if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t(`type.${d.type}`)}
        sub={<Pill tone={STATUS_TONE[d.status]}>{t(`status.${d.status}`)}</Pill>}
        actions={
          <>
            <Button variant="ghost" href={isThought ? "/admin/content/thoughts" : "/admin/content"}>
              {t("back")}
            </Button>
            <Button variant="secondary" pending={pending === "save"} onClick={() => save()}>
              {t("save")}
            </Button>
            {d.status === "published" ? (
              <Button variant="secondary" pending={pending === "hidden"} onClick={() => save("hidden")}>
                {t("hide")}
              </Button>
            ) : (
              <Button pending={pending === "published"} onClick={() => save("published")}>
                {t("publish")}
              </Button>
            )}
          </>
        }
      />
      {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
      <Panel>
        <div className={c.stack}>
          {d.key ? <p className={styles.cap}>{t("sectionKey", { key: d.key })}</p> : null}
          {!isThought ? <I18nFields label={t("fTitle")} value={title} onChange={setTitle} requiredEn={false} maxLength={300} /> : null}
          <I18nFields label={isThought ? t("fThought") : t("fText")} value={body} onChange={setBody} multiline rows={4} error={errors.title} maxLength={4000} />
          {isThought ? <I18nFields label={t("fSource")} value={source} onChange={setSource} requiredEn={false} maxLength={300} /> : null}
          {isThought ? <DateField id="thought-date" label={t("fDate")} value={date} messages={errors.date ? [{ type: "error", text: errors.date }] : undefined} onChange={setDate} /> : null}
          {!isThought ? <Input label={t("fLink")} optional value={href} maxLength={400} hint={t("fLinkHint")} onChange={(e) => setHref(e.target.value)} /> : null}
          {isAnn ? (
            <div className={c.row}>
              <Input type="datetime-local" label={t("fStarts")} optional value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              <Input type="datetime-local" label={t("fEnds")} optional value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
