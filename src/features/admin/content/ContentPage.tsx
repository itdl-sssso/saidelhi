"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { type ContentRow, type ContentStatus, type ContentTab, ContentTab as ContentTabEnum, adminEndpoints } from "@/contract";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input } from "@/ui/Input";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { FilterBar } from "../FilterBar";
import { ConfirmDialog } from "../Dialogs";
import { PageHead, Pill, type Tone } from "../kit";
import { RowMenu } from "../Menu";
import { Eye, EyeOff, Pencil, Trash2 } from "../icons";
import type { OrgOptions } from "../server";
import { hrefWith } from "../url";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useContentTypes } from "./ContentTypesPage";
import { Lang, LinkTabs, Loadable, TableFoot } from "../parts";
import styles from "../Admin.module.css";

export const STATUS_TONE: Record<ContentStatus, Tone> = { draft: "slate", scheduled: "yellow", published: "green", hidden: "pink" };
const NEW_TYPES = ["article", "news", "announcement", "home_section"] as const;

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
}

export function ContentPage({ org }: { org: OrgOptions }) {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const router = useRouter();
  const { run, pending } = useAction();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const rawTab = sp.get("tab") as ContentTab | null;
  const tab: ContentTab = rawTab && ContentTabEnum.options.includes(rawTab) ? rawTab : "all";
  const status = sp.get("status") || undefined;
  const lang = sp.get("lang") === "hi_missing" ? ("hi_missing" as const) : undefined;
  const district = sp.get("district") || undefined;
  const q = sp.get("q") || undefined;
  const params = Object.fromEntries(sp.entries());
  const api = useApi<ContentRow[], Meta>(adminEndpoints.content({ tab, status, lang, district, q, page, pageSize: 20 }));
  const types = useContentTypes();
  const [creating, setCreating] = useState(false);
  const [fromEvent, setFromEvent] = useState(false);
  const [del, setDel] = useState<ContentRow | null>(null);

  const hide = async (r: ContentRow) => {
    const d = await fetch(adminEndpoints.contentItem(r.id), { credentials: "same-origin" }).then((x) => x.json()).catch(() => null);
    const version = d?.data?.version ?? 0;
    const res = await run(adminEndpoints.contentItem(r.id), { method: "PATCH", body: { status: r.status === "hidden" ? "published" : "hidden", version } }, { key: `h-${r.id}`, success: t("saved"), onReload: api.reload });
    if (res.ok) api.reload();
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          <>
            <Button variant="secondary" icon="list" href="/admin/content/types">
              {t("typesLink")}
            </Button>
            <Button variant="secondary" icon="calendar-days" href="/admin/content/thoughts">
              {t("thoughts")}
            </Button>
            <Button variant="secondary" icon="file-text" onClick={() => setFromEvent(true)}>
              {t("fromEvent")}
            </Button>
            <Button icon="plus" onClick={() => setCreating(true)}>
              {t("new")}
            </Button>
          </>
        }
      />
      <LinkTabs path="/admin/content" tabs={ContentTabEnum.options} current={tab} label={t("tabsLabel")} labels={Object.fromEntries(ContentTabEnum.options.map((x) => [x, t(`tab.${x}`)])) as Record<ContentTab, string>} counts={api.status === "ready" ? api.meta?.counts : undefined} />
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("search") },
          { kind: "select", key: "status", label: t("colStatus"), options: (["draft", "scheduled", "published", "hidden"] as const).map((s) => ({ value: s, label: t(`status.${s}`) })) },
          { kind: "select", key: "lang", label: t("colLang"), options: [{ value: "hi_missing", label: t("hiMissing") }] },
          ...(org.districts.length > 1 ? [{ kind: "select" as const, key: "district", label: t("colDistrict"), options: org.districts }] : []),
        ]}
      />
      <Loadable api={api} rows={6}>
        {(rows, meta) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="newspaper" title={q || status || lang || district ? t("noMatch") : t("empty")} />
              </div>
            ) : (
              <div className={styles.tblScroll} tabIndex={0}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colTitle")}</th>
                      <th scope="col">{t("colType")}</th>
                      <th scope="col">{t("colDistrict")}</th>
                      <th scope="col">{t("colLang")}</th>
                      <th scope="col">{t("colStatus")}</th>
                      <th scope="col">{t("colUpdated")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link href={`/admin/content/${r.id}`} className={styles.tblT}>
                            {tx(r.title, locale) || t("untitled")}
                          </Link>
                          {r.legacy ? (
                            <>
                              <br />
                              <span className={styles.tblSub}>{t("legacy")}</span>
                            </>
                          ) : null}
                        </td>
                        <td>{r.category ? types.label(r.category) : t(`type.${r.type}`)}</td>
                        <td>{r.district ? tx(r.district.name, locale) : "—"}</td>
                        <td>
                          <Lang en={r.languages.en} hi={r.languages.hi} />
                        </td>
                        <td>
                          <Pill tone={STATUS_TONE[r.status]}>{t(`status.${r.status}`)}</Pill>
                          {r.status === "scheduled" && r.publishAt ? <span className={styles.tblSub}> {formatDate(r.publishAt, locale)}</span> : null}
                        </td>
                        <td>{formatDate(r.date ?? r.updatedAt, locale)}</td>
                        <td>
                          <RowMenu
                            items={[
                              { icon: Pencil, label: t("edit"), href: `/admin/content/${r.id}` },
                              { icon: r.status === "hidden" ? Eye : EyeOff, label: r.status === "hidden" ? t("unhide") : t("hide"), hidden: r.status === "draft", onClick: () => hide(r) },
                              { icon: Trash2, label: t("deleteDraft"), danger: true, hidden: r.status !== "draft" || r.legacy, onClick: () => setDel(r) },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {meta && meta.total > meta.pageSize ? (
              <div className={styles.pagerWrap}>
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/content", params, { page: n })} />
              </div>
            ) : null}
            <TableFoot icon="info">{t("foot")}</TableFoot>
          </div>
        )}
      </Loadable>
      <NewDialog open={creating} onClose={() => setCreating(false)} onDone={(id) => router.push(`/admin/content/${id}`)} />
      <FromEventDialog open={fromEvent} onClose={() => setFromEvent(false)} onDone={(id) => router.push(`/admin/content/${id}`)} />
      <ConfirmDialog
        open={del !== null}
        onClose={() => setDel(null)}
        title={t("deleteTitle")}
        body={t("deleteBody", { title: del ? tx(del.title, locale) : "" })}
        confirmLabel={t("deleteDraft")}
        danger
        pending={pending === "del"}
        onConfirm={async () => {
          if (!del) return false;
          const res = await run(adminEndpoints.contentItem(del.id), { method: "DELETE" }, { key: "del", success: t("deleted"), onReload: api.reload });
          if (res.ok) api.reload();
          return res.ok;
        }}
      />
    </div>
  );
}

function NewDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const t = useTranslations("admin.content");
  const { run, pending } = useAction();
  const [type, setType] = useState<(typeof NEW_TYPES)[number]>("article");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    if (!title.trim()) return setErr(t("errTitle"));
    const text = { en: title.trim(), hi: null };
    const body =
      type === "article" || type === "news"
        ? { kind: "article", category: type === "news" ? "news" : "stories", title: text }
        : { kind: "item", type, title: text };
    const res = await run<{ id: string }>(adminEndpoints.content(), { body }, { key: "new", quiet422: true, refresh: false });
    if (res.ok) {
      onClose();
      onDone(res.data.id);
    } else if (res.status === 422) setErr(res.error.message);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("newTitle")}
      width={480}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "new"} onClick={go}>
            {t("create")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <Select label={t("colType")} value={type} onChange={(e) => setType(e.target.value as typeof type)} options={NEW_TYPES.map((x) => ({ value: x, label: t(`newType.${x}`) }))} />
        <Input label={t("colTitle")} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} />
        <p className={styles.cap}>{t("newThought")}</p>
      </div>
    </Dialog>
  );
}

interface EventOpt {
  id: string;
  title: { en: string; hi: string | null };
  startsAt: string;
  samithi: { name: { en: string; hi: string | null } };
}

function FromEventDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const t = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const api = useApi<EventOpt[]>(open ? adminEndpoints.events({ status: "approved", pageSize: 50 }) : null);
  const [id, setId] = useState("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("fromEventTitle")}
      width={520}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!id}
            pending={pending === "fe"}
            onClick={async () => {
              const res = await run<{ id: string }>(adminEndpoints.contentFromEvent(id), {}, { key: "fe", refresh: false });
              if (res.ok) {
                onClose();
                onDone(res.data.id);
              }
            }}
          >
            {t("create")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <p>{t("fromEventBody")}</p>
        <Loadable api={api} rows={3}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState icon="calendar-days" title={t("noApproved")} />
            ) : (
              <Select
                label={t("pickEvent")}
                value={id}
                onChange={(e) => setId(e.target.value)}
                options={[{ value: "", label: t("pick") }, ...rows.map((e) => ({ value: e.id, label: `${tx(e.title, locale)} · ${tx(e.samithi.name, locale)} · ${formatDate(e.startsAt, locale)}` }))]}
              />
            )
          }
        </Loadable>
      </div>
    </Dialog>
  );
}
