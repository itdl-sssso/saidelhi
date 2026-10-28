"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { type ContentTypeRow, adminEndpoints } from "@/contract";
import type { AppLocale } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Switch } from "@/ui/Switch";
import { PageHead } from "../kit";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { Loadable } from "../parts";
import styles from "../Admin.module.css";
import c from "./Content.module.css";

/** Names of the article types for selects and tables; falls back to the slug until loaded. */
export function useContentTypes() {
  const locale = useLocale() as AppLocale;
  const api = useApi<ContentTypeRow[]>(adminEndpoints.contentTypes());
  const rows = api.status === "ready" ? api.data : [];
  const name = (r: Pick<ContentTypeRow, "labelEn" | "labelHi">) => (locale === "hi" && r.labelHi ? r.labelHi : r.labelEn);
  const label = (slug: string) => {
    const r = rows.find((x) => x.slug === slug);
    return r ? name(r) : slug;
  };
  return { api, rows, name, label };
}

export function ContentTypesPage() {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const api = useApi<ContentTypeRow[]>(adminEndpoints.contentTypes());
  const [en, setEn] = useState("");
  const [hi, setHi] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    setErr(null);
    const res = await run(adminEndpoints.contentTypes(), { body: { labelEn: en, labelHi: hi || null } }, { key: "add", success: t("typeAdded"), quiet422: true, refresh: false, onReload: api.reload });
    if (res.ok) {
      setEn("");
      setHi("");
      api.reload();
    } else if (res.status === 422) setErr(res.error.fields?.labelEn ?? res.error.message);
  };
  const reorder = async (rows: ContentTypeRow[], from: number, to: number) => {
    const next = [...rows];
    next.splice(to, 0, next.splice(from, 1)[0]);
    const res = await run(adminEndpoints.contentTypesReorder(), { body: { slugs: next.map((r) => r.slug) } }, { key: `mv-${from}`, refresh: false, onReload: api.reload });
    if (res.ok) api.reload();
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t("typesTitle")}
        sub={t("typesSub")}
        actions={
          <Button variant="ghost" href="/admin/content">
            {t("back")}
          </Button>
        }
      />
      <Loadable api={api} rows={5}>
        {(rows) => (
          <ul className={c.typeList}>
            {rows.map((r, i) => (
              <TypeRow key={`${r.slug}-${r.version}-${r.labelEn}-${r.labelHi}`} r={r} first={i === 0} last={i === rows.length - 1} pending={pending} locale={locale} onMove={(d) => reorder(rows, i, i + d)} onSaved={api.reload} onReload={api.reload} />
            ))}
          </ul>
        )}
      </Loadable>
      <section className={c.typeAdd} aria-label={t("typeAdd")}>
        <h2 className={c.typeH}>{t("typeAdd")}</h2>
        <div className={c.typeFields}>
          <Input label={t("typeNameEn")} value={en} maxLength={60} error={err ?? undefined} onChange={(e) => setEn(e.target.value)} />
          <Input label={t("typeNameHi")} lang="hi" optional value={hi} maxLength={60} onChange={(e) => setHi(e.target.value)} />
          <Button icon="plus" disabled={en.trim().length < 2} pending={pending === "add"} onClick={add}>
            {t("typeAddBtn")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function TypeRow({ r, first, last, pending, onMove, onSaved, onReload }: { r: ContentTypeRow; first: boolean; last: boolean; pending: string | null; locale: AppLocale; onMove: (d: -1 | 1) => void; onSaved: () => void; onReload: () => void }) {
  const t = useTranslations("admin.content");
  const { run } = useAction();
  const [en, setEn] = useState(r.labelEn);
  const [hi, setHi] = useState(r.labelHi ?? "");
  const [err, setErr] = useState<string | null>(null);
  const dirty = en.trim() !== r.labelEn || (hi.trim() || null) !== r.labelHi;
  const patch = async (body: Record<string, unknown>, key: string) => {
    setErr(null);
    const res = await run(adminEndpoints.contentType(r.slug), { method: "PATCH", body: { ...body, version: r.version } }, { key, success: t("saved"), quiet422: true, refresh: false, onReload });
    if (res.ok) onSaved();
    else if (res.status === 422) setErr(res.error.fields?.active ?? res.error.fields?.labelEn ?? res.error.message);
  };
  return (
    <li className={c.typeRow}>
      <div className={c.typeFields}>
        <Input label={t("typeNameEn")} value={en} maxLength={60} error={err ?? undefined} onChange={(e) => setEn(e.target.value)} />
        <Input label={t("typeNameHi")} lang="hi" optional value={hi} maxLength={60} onChange={(e) => setHi(e.target.value)} />
      </div>
      <p className={styles.cap}>
        <code>{r.slug}</code> · {t("typeArticles", { n: r.articles })}
        {r.builtin ? ` · ${t("typeBuiltin")}` : ""}
      </p>
      <div className={c.typeActions}>
        <Switch label={t("typeActive")} checked={r.active} disabled={pending === `a-${r.slug}`} onChange={(e) => patch({ active: e.target.checked }, `a-${r.slug}`)} />
        <Button variant="secondary" disabled={!dirty || en.trim().length < 2} pending={pending === `s-${r.slug}`} onClick={() => patch({ labelEn: en, labelHi: hi || null }, `s-${r.slug}`)}>
          {t("typeSave")}
        </Button>
        <Button variant="ghost" aria-label={t("typeUp", { name: r.labelEn })} disabled={first} onClick={() => onMove(-1)}>
          {t("typeUpShort")}
        </Button>
        <Button variant="ghost" aria-label={t("typeDown", { name: r.labelEn })} disabled={last} onClick={() => onMove(1)}>
          {t("typeDownShort")}
        </Button>
      </div>
    </li>
  );
}
