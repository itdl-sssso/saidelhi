"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ArticleCategory, type ArticleEditor as ArticleDetail, type ContentDetail, type ContentItemEditor, UPLOAD_LIMITS, type Media, adminEndpoints } from "@/contract";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input, Textarea } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Tabs } from "@/ui/Tabs";
import { PageHead, Panel, Pill } from "../kit";
import { Icon } from "@/ui/Icon";
import { ImagePlus } from "../icons";
import type { OrgOptions } from "../server";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { Loadable, Note } from "../parts";
import { ItemEditor } from "./ItemEditor";
import { RichEditor } from "./RichEditor";
import { STATUS_TONE } from "./ContentPage";
import styles from "../Admin.module.css";
import c from "./Content.module.css";

export function ContentEditorPage({ id, org }: { id: string; org: OrgOptions }) {
  const api = useApi<ContentDetail>(adminEndpoints.contentItem(id));
  return (
    <Loadable api={api} rows={6}>
      {(d) => (d.kind === "article" ? <Article key={`${d.id}-${d.version}`} d={d} org={org} reload={api.reload} /> : <ItemEditor key={`${d.id}-${d.version}`} d={d as ContentItemEditor} reload={api.reload} />)}
    </Loadable>
  );
}

interface State {
  title: { en: string; hi: string };
  summary: { en: string; hi: string };
  body: { en: string; hi: string };
  category: ArticleDetail["category"];
  districtId: string;
  eventId: string;
  cover: Media | null;
  publishAt: string;
}
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const from = (d: ArticleDetail): State => ({
  title: { en: d.title.en, hi: d.title.hi ?? "" },
  summary: { en: d.summary.en, hi: d.summary.hi ?? "" },
  body: { en: d.bodyHtml.en, hi: d.bodyHtml.hi ?? "" },
  category: d.category,
  districtId: d.district?.id ?? "",
  eventId: d.event?.id ?? "",
  cover: d.cover,
  publishAt: local(d.publishAt),
});

function Article({ d, org, reload }: { d: ArticleDetail; org: OrgOptions; reload: () => void }) {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const { upload, pending: uploading } = useUpload();
  const [s, setS] = useState<State>(from(d));
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState(false);
  const [base] = useState(() => JSON.stringify(from(d)));
  const dirty = JSON.stringify(s) !== base;
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((x) => ({ ...x, [k]: v }));
  const setL = (k: "title" | "summary" | "body", v: string) => setS((x) => ({ ...x, [k]: { ...x[k], [lang]: v } }));
  const events = useApi<Array<{ id: string; title: { en: string; hi: string | null }; startsAt: string }>>(adminEndpoints.events({ status: "approved", pageSize: 50 }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const i18n = (v: { en: string; hi: string }) => ({ en: v.en.trim(), hi: v.hi.trim() || null });
  const save = async (status?: "published" | "scheduled" | "hidden" | "draft", publishAt?: string | null) => {
    const e: Record<string, string> = {};
    if (!s.title.en.trim()) e.title = t("errTitle");
    setErrors(e);
    if (Object.keys(e).length) return false;
    const body = {
      category: s.category,
      title: i18n(s.title),
      summary: i18n(s.summary),
      bodyHtml: i18n(s.body),
      cover: s.cover,
      districtId: s.districtId || null,
      eventId: s.eventId || null,
      ...(status ? { status, publishAt: publishAt === undefined ? null : publishAt } : {}),
      version: d.version,
    };
    const res = await run(adminEndpoints.contentItem(d.id), { method: "PATCH", body }, { key: status ?? "save", success: status === "published" ? t("published") : status === "scheduled" ? t("scheduled") : t("saved"), quiet422: true, onReload: reload });
    if (res.ok) {
      reload();
      return true;
    }
    if (res.status === 422) setErrors(res.error.fields ?? { form: res.error.message });
    return false;
  };

  const uploadImage = async (file: File, alt: string): Promise<string | null> => {
    if (!(UPLOAD_LIMITS.photoMimes as readonly string[]).includes(file.type) || file.size > UPLOAD_LIMITS.photoBytes) {
      setErrors({ form: t("errImageFile") });
      return null;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("alt", alt);
    const res = await upload<Media>(adminEndpoints.contentMedia(), fd, "media");
    return res.ok ? res.data.url : null;
  };

  const hiMissing = !s.title.hi.trim() || !s.body.hi.replace(/<[^>]*>/g, "").trim();
  const canPublish = d.status !== "published";
  const slugPath = d.publicPath;

  return (
    <div className={styles.page}>
      <PageHead
        title={s.title.en || t("untitled")}
        sub={
          <>
            <Pill tone={STATUS_TONE[d.status]}>{t(`status.${d.status}`)}</Pill>
            {d.status === "scheduled" && d.publishAt ? ` ${t("goesLive", { when: formatDate(d.publishAt, locale) })}` : ""}
            {d.legacyId ? ` · ${t("legacy")}` : ""}
          </>
        }
        actions={
          <>
            <Button variant="ghost" href="/admin/content">
              {t("back")}
            </Button>
            <Button variant="secondary" disabled={!dirty} pending={pending === "save"} onClick={() => save()}>
              {t("saveDraft")}
            </Button>
            <Button variant="secondary" onClick={() => setSchedule(true)}>
              {t("schedule")}
            </Button>
            <Button pending={pending === "published"} onClick={() => save("published")}>
              {canPublish ? t("publish") : t("update")}
            </Button>
          </>
        }
      />
      {errors.form ? <Alert tone="error">{errors.form}</Alert> : null}
      {d.legacyId && d.version === 0 ? <Alert tone="info">{t("legacyNote")}</Alert> : null}
      <div className={c.layout}>
        <div className={c.stack}>
          <Tabs
            label={t("langTabs")}
            value={lang}
            onChange={(v) => setLang(v as "en" | "hi")}
            tabs={[
              { id: "en", label: t("langEn") },
              { id: "hi", label: <>{t("langHi")}{hiMissing ? <span className={styles.cap}> · {t("missing")}</span> : null}</> },
            ]}
          />
          {lang === "hi" && hiMissing ? <Note icon="languages">{t("hiNote")}</Note> : null}
          <Input key={`t-${lang}`} label={t("fTitle")} lang={lang === "hi" ? "hi" : undefined} value={s.title[lang]} error={errors.title ?? errors["title.en"]} maxLength={300} onChange={(e) => setL("title", e.target.value)} />
          <Textarea key={`s-${lang}`} label={t("fSummary")} lang={lang === "hi" ? "hi" : undefined} optional rows={3} value={s.summary[lang]} maxLength={1000} onChange={(e) => setL("summary", e.target.value)} />
          <RichEditor value={s.body[lang]} lang={lang} label={t("fBody")} eventId={s.eventId || null} onChange={(html) => setL("body", html)} onUpload={uploadImage} imageBusy={uploading === "media"} />
          {!s.eventId ? <p className={styles.cap}>{t("resultsNeedsEvent")}</p> : null}
        </div>
        <aside className={c.stack}>
          <Panel title={t("details")}>
            <div className={c.stack}>
              <Select label={t("fCategory")} value={s.category} onChange={(e) => set("category", e.target.value as State["category"])} options={ArticleCategory.options.map((x) => ({ value: x, label: t(`cat.${x}`) }))} />
              {org.districts.length ? <Select label={t("colDistrict")} value={s.districtId} onChange={(e) => set("districtId", e.target.value)} options={[{ value: "", label: t("allNcr") }, ...org.districts]} /> : null}
              <Loadable api={events} rows={1}>
                {(rows) => (
                  <Select
                    label={t("fEvent")}
                    value={s.eventId}
                    onChange={(e) => set("eventId", e.target.value)}
                    options={[{ value: "", label: t("noEvent") }, ...(d.event && !rows.some((r) => r.id === d.event!.id) ? [{ value: d.event.id, label: tx(d.event.title, locale) }] : []), ...rows.map((r) => ({ value: r.id, label: `${tx(r.title, locale)} · ${formatDate(r.startsAt, locale)}` }))]}
                  />
                )}
              </Loadable>
              <CoverField cover={s.cover} onChange={(m) => set("cover", m)} upload={uploadImage} busy={uploading === "media"} />
            </div>
          </Panel>
          <Panel title={t("preview")}>
            <div className={c.row}>
              <Button variant="secondary" size="sm" href={slugPath} target="_blank" iconAfter="external-link">
                {t("previewEn")}
              </Button>
              <Button variant="secondary" size="sm" href={`/hi${slugPath}`} target="_blank" iconAfter="external-link">
                {t("previewHi")}
              </Button>
            </div>
            <p className={styles.cap}>{t("previewNote")}</p>
          </Panel>
        </aside>
      </div>
      <Dialog
        open={schedule}
        onClose={() => setSchedule(false)}
        title={t("scheduleTitle")}
        width={440}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setSchedule(false)}>
              {t("cancel")}
            </Button>
            <Button
              pending={pending === "scheduled"}
              onClick={async () => {
                if (!s.publishAt || new Date(s.publishAt).getTime() <= Date.now()) return setErrors({ publishAt: t("errFuture") });
                setErrors({});
                if (await save("scheduled", new Date(s.publishAt).toISOString())) setSchedule(false);
              }}
            >
              {t("schedule")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <Input type="datetime-local" label={t("publishOn")} value={s.publishAt} error={errors.publishAt} onChange={(e) => set("publishAt", e.target.value)} />
          <p className={styles.cap}>{t("scheduleNote")}</p>
        </div>
      </Dialog>
    </div>
  );
}

function CoverField({ cover, onChange, upload, busy }: { cover: Media | null; onChange: (m: Media | null) => void; upload: (f: File, alt: string) => Promise<string | null>; busy: boolean }) {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const ref = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(cover ? tx(cover.alt, locale) : "");
  return (
    <div className={c.stack}>
      <span className={styles.cap}>{t("fCover")}</span>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.url} alt={tx(cover.alt, locale)} className={c.cover} />
      ) : null}
      <Input label={t("coverAlt")} value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        tabIndex={-1}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !alt.trim()) return;
          const url = await upload(f, alt.trim());
          if (url) onChange({ url, width: null, height: null, alt: { en: alt.trim(), hi: null } });
        }}
      />
      <div className={c.row}>
        <Button variant="secondary" size="sm" pending={busy} disabled={!alt.trim()} onClick={() => ref.current?.click()}>
          <Icon icon={ImagePlus} size={16} /> {cover ? t("coverChange") : t("coverAdd")}
        </Button>
        {cover ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t("coverRemove")}
          </Button>
        ) : null}
      </div>
      {!alt.trim() ? <span className={styles.cap}>{t("coverNeedsAlt")}</span> : null}
    </div>
  );
}
