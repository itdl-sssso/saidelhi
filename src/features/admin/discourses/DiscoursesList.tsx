"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DISCOURSE_THEMES,
  DiscourseStatus as StatusEnum,
  type AdminDiscourseDetail,
  type AdminDiscourseRow,
  type AdminDiscoursesMeta,
  type DiscourseCreate,
  type DiscourseReviewer,
  type DiscourseTheme,
  type GlossaryTerm,
  adminEndpoints,
} from "@/contract";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Input, Textarea } from "@/ui/Input";
import { MultiSelect } from "@/ui/MultiSelect";
import { Meter } from "@/ui/Meter";
import { Pagination } from "@/ui/Pagination";
import { Select } from "@/ui/Select";
import { SideSheet } from "@/ui/SideSheet";
import { FilterBar } from "../FilterBar";
import { PageHead } from "../kit";
import { RowMenu } from "../Menu";
import { Loadable, Note, TableFoot } from "../parts";
import { hrefWith } from "../url";
import { type Result, fx, get, useDisc, useDiscMutate } from "./api";
import { StatusPill } from "./shared";
import styles from "../Admin.module.css";
import d from "./Discourses.module.css";

export interface ListCan {
  /** discourses.edit: add to shortlist, request AI draft. */
  edit: boolean;
  /** discourses.review: assign reviewers. */
  review: boolean;
}

const THEMES = Object.keys(DISCOURSE_THEMES) as DiscourseTheme[];

export function DiscoursesList({ can }: { can: ListCan }) {
  const t = useTranslations("admin.discourses");
  const locale = useLocale() as AppLocale;
  const sp = useSearchParams();
  const router = useRouter();
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const q = sp.get("q") || undefined;
  const theme = (sp.get("theme") as DiscourseTheme | null) || undefined;
  const rawStatus = sp.get("status");
  const status = rawStatus && (StatusEnum.options as readonly string[]).includes(rawStatus) ? (rawStatus as (typeof StatusEnum.options)[number]) : undefined;
  const reviewer = sp.get("reviewer") || undefined;
  const params = Object.fromEntries(sp.entries());
  const query = { q, theme, status, reviewer, page };
  const url = adminEndpoints.discourses({ ...query, pageSize: 25 });
  const api = useDisc<AdminDiscourseRow[]>(url, (l) => get(url, l, () => fx.list(query)));
  const { run, pending } = useDiscMutate(api.reload);
  const [adding, setAdding] = useState(false);
  const [glossary, setGlossary] = useState(false);
  const [assign, setAssign] = useState<AdminDiscourseRow | null>(null);
  const [seen, setSeen] = useState<DiscourseReviewer[]>([]);

  useEffect(() => {
    if (api.status !== "ready") return;
    setSeen((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      for (const r of api.data) if (r.reviewer) map.set(r.reviewer.id, r.reviewer);
      return map.size === prev.length ? prev : [...map.values()];
    });
  }, [api.status, api.data]);

  const meta = api.status === "ready" ? (api.meta as (AdminDiscoursesMeta & { pageSize: number }) | null) : null;

  const aiDraft = async (r: AdminDiscourseRow) => {
    const det = await get<AdminDiscourseDetail>(adminEndpoints.discourse(r.id), locale, () => fx.detail(r.id));
    if (!det.ok) return;
    const res = await run(adminEndpoints.discourseAction(r.id, "ai-draft"), "POST", { version: det.data.version }, () => fx.action(r.id, "ai-draft", { version: det.data.version }), { key: `ai-${r.id}` });
    if (res.ok) api.reload();
  };

  return (
    <div className={styles.page}>
      <PageHead
        title={t("title")}
        sub={t("sub")}
        actions={
          <>
            <Button variant="secondary" icon="languages" onClick={() => setGlossary(true)}>
              {t("glossary")}
            </Button>
            {can.edit ? (
              <Button icon="plus" onClick={() => setAdding(true)}>
                {t("add")}
              </Button>
            ) : null}
          </>
        }
      />
      {meta && !meta.flagOn ? (
        <Note icon="eye-off">{t("flagOff")}</Note>
      ) : null}
      {meta ? (
        <nav className={d.tiles} aria-label={t("tilesLabel")}>
          {(["all", ...StatusEnum.options] as const).map((s) => (
            <Link key={s} href={hrefWith("/admin/discourses", params, { status: s === "all" ? null : s, page: null })} className={`${d.tile} ${(status ?? "all") === s ? d.tileOn : ""}`} aria-current={(status ?? "all") === s ? "page" : undefined}>
              <span className={d.tileN}>{meta.counts[s] ?? 0}</span>
              <span className={d.tileL}>{s === "all" ? t("all") : t(`status.${s}`)}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      <FilterBar
        fields={[
          { kind: "search", key: "q", label: t("search") },
          { kind: "select", key: "theme", label: t("colThemes"), options: THEMES.map((k) => ({ value: k, label: tx(DISCOURSE_THEMES[k].label, locale) })) },
          { kind: "select", key: "status", label: t("colStatus"), options: StatusEnum.options.map((s) => ({ value: s, label: t(`status.${s}`) })) },
          { kind: "select", key: "reviewer", label: t("colReviewer"), options: [{ value: "none", label: t("unassigned") }, ...seen.map((r) => ({ value: r.id, label: r.name }))] },
        ]}
      />
      <Loadable api={api} rows={6}>
        {(rows) => (
          <div className={styles.tblWrap}>
            {rows.length === 0 ? (
              <div className={styles.cardBd}>
                <EmptyState icon="book-open" title={q || theme || status || reviewer ? t("noMatch") : t("empty")} />
              </div>
            ) : (
              <div className={styles.tblScroll}>
                <table className={styles.tbl}>
                  <thead>
                    <tr>
                      <th scope="col">{t("colNo")}</th>
                      <th scope="col">{t("colTitle")}</th>
                      <th scope="col">{t("colThemes")}</th>
                      <th scope="col">{t("colStatus")}</th>
                      <th scope="col">{t("colReviewer")}</th>
                      <th scope="col">{t("colProgress")}</th>
                      <th scope="col">{t("colUpdated")}</th>
                      <th scope="col">
                        <span className={styles.srOnly}>{t("actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className={styles.num}>{r.n}</td>
                        <td>
                          <Link href={`/admin/discourses/${r.id}`} className={styles.tblT}>
                            {tx(r.title, locale)}
                          </Link>
                          <br />
                          <span className={styles.tblSub}>{r.coll}</span>
                        </td>
                        <td>
                          <span className={d.chips}>
                            {r.themes.map((k) => (
                              <span key={k} className={d.chip}>
                                {tx(DISCOURSE_THEMES[k].label, locale)}
                              </span>
                            ))}
                          </span>
                        </td>
                        <td>
                          <StatusPill status={r.status} />
                        </td>
                        <td>{r.reviewer?.name ?? <span className={styles.tblSub}>{t("unassigned")}</span>}</td>
                        <td className={d.progress}>
                          <Meter value={r.blocks.approved} max={r.blocks.total} label={t("progressLabel", { done: r.blocks.approved, total: r.blocks.total })} caption={`${r.blocks.approved}/${r.blocks.total}`} tone="green" />
                        </td>
                        <td>{formatDate(r.updatedAt, locale)}</td>
                        <td>
                          <RowMenu
                            items={[
                              { icon: "book-open", label: t("open"), href: `/admin/discourses/${r.id}` },
                              { icon: "sparkles", label: t("aiDraft"), hidden: !can.edit || (r.status !== "not_started" && r.status !== "ai_draft") || pending === `ai-${r.id}`, onClick: () => aiDraft(r) },
                              { icon: "user", label: t("assign"), hidden: !can.review, onClick: () => setAssign(r) },
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
                <Pagination page={page} pageSize={meta.pageSize} total={meta.total} href={(n) => hrefWith("/admin/discourses", params, { page: n })} />
              </div>
            ) : null}
            <TableFoot icon="info">{t("foot")}</TableFoot>
          </div>
        )}
      </Loadable>
      <CreateDialog open={adding} onClose={() => setAdding(false)} onDone={(id) => router.push(`/admin/discourses/${id}`)} />
      <GlossarySheet open={glossary} onClose={() => setGlossary(false)} />
      <AssignDialog row={assign} onClose={() => setAssign(null)} onDone={api.reload} />
    </div>
  );
}

function CreateDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const t = useTranslations("admin.discourses");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useDiscMutate(() => {});
  const [f, setF] = useState({ title: "", titleHi: "", coll: "", date: "", place: "", occasion: "", why: "", source: "" });
  const [themes, setThemes] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const go = async () => {
    if (!f.title.trim() || !f.coll.trim() || !f.source.trim()) return setErr(t("createRequired"));
    if (themes.length === 0) return setErr(t("createThemes"));
    const body: DiscourseCreate = {
      title: { en: f.title.trim(), hi: f.titleHi.trim() || null },
      meta: { collPrint: f.coll.trim(), collOnline: null, date: f.date.trim(), place: f.place.trim(), occasion: f.occasion.trim(), sourceUrl: null, pdfUrl: null, retrieved: null },
      themes: themes as DiscourseTheme[],
      why: { en: f.why.trim(), hi: null },
      sourceText: f.source.trim(),
    };
    const res = await run<AdminDiscourseDetail>(adminEndpoints.discourses(), "POST", body, () => fx.create(body), { key: "create", quiet: true });
    if (res.ok) {
      setErr(null);
      onClose();
      onDone(res.data.id);
    } else if (res.status === 422) setErr(Object.values(res.error.fields ?? {})[0] ?? res.error.message);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("addTitle")}
      width={640}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button pending={pending === "create"} onClick={go}>
            {t("create")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <p className={styles.cap}>{t("addBody")}</p>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <Input label={t("fTitle")} value={f.title} maxLength={200} onChange={set("title")} />
        <Input label={t("fTitleHi")} optional lang="hi" value={f.titleHi} maxLength={200} onChange={set("titleHi")} />
        <div className={`${styles.fieldGrid} ${styles.fieldGrid2}`}>
          <Input label={t("fColl")} hint={t("fCollHint")} value={f.coll} onChange={set("coll")} />
          <Input label={t("fDate")} value={f.date} onChange={set("date")} />
          <Input label={t("fPlace")} value={f.place} onChange={set("place")} />
          <Input label={t("fOccasion")} value={f.occasion} onChange={set("occasion")} />
        </div>
        <MultiSelect id="disc-themes" label={t("fThemes")} help={t("fThemesHint")} value={themes} onChange={(v) => setThemes(v.slice(0, 4))} options={THEMES.map((k) => ({ value: k, label: tx(DISCOURSE_THEMES[k].label, locale) }))} />
        <Input label={t("fWhy")} optional value={f.why} maxLength={300} onChange={set("why")} />
        <Textarea label={t("fSource")} hint={t("fSourceHint")} rows={8} value={f.source} onChange={set("source")} />
      </div>
    </Dialog>
  );
}

function GlossarySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.discourses");
  const url = open ? adminEndpoints.discourseGlossary() : null;
  const api = useDisc<GlossaryTerm[]>(url, (l) => get(adminEndpoints.discourseGlossary(), l, () => fx.glossary()));
  return (
    <SideSheet open={open} onClose={onClose} title={t("glossary")}>
      <p className={styles.cap}>{t("glossaryBody")}</p>
      {open ? (
        <Loadable api={api} rows={5}>
          {(terms) =>
            terms.length === 0 ? (
              <EmptyState icon="languages" title={t("glossaryEmpty")} />
            ) : (
              <div>
                {terms.map((g) => (
                  <div key={g.term} className={d.glossRow}>
                    <span>
                      <span className={d.glossTerm}>{g.term}</span> → <span lang="hi">{g.hi}</span>
                    </span>
                    {g.gloss ? <span className={styles.cap}>{g.gloss}</span> : null}
                  </div>
                ))}
              </div>
            )
          }
        </Loadable>
      ) : null}
    </SideSheet>
  );
}

function AssignDialog({ row, onClose, onDone }: { row: AdminDiscourseRow | null; onClose: () => void; onDone: () => void }) {
  const t = useTranslations("admin.discourses");
  const id = row?.id ?? null;
  const api = useDisc<AdminDiscourseDetail>(id, (l) => get(adminEndpoints.discourse(id ?? ""), l, () => fx.detail(id ?? "")));
  const { run, pending } = useDiscMutate(api.reload);
  const [pick, setPick] = useState<string | null>(null);
  const det = api.status === "ready" ? api.data : null;
  const value = pick ?? det?.reviewer?.id ?? "";
  const save = async () => {
    if (!det) return;
    const body = { version: det.version, reviewerId: value || null };
    const res: Result<unknown> = await run(adminEndpoints.discourse(det.id), "PATCH", body, () => fx.patch(det.id, body), { key: "assign" });
    if (res.ok) {
      setPick(null);
      onClose();
      onDone();
    }
  };
  return (
    <Dialog
      open={row !== null}
      onClose={() => {
        setPick(null);
        onClose();
      }}
      title={t("assignTitle")}
      width={460}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!det} pending={pending === "assign"} onClick={save}>
            {t("save")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {row ? (
          <Loadable api={api} rows={2}>
            {(x) => <Select label={t("colReviewer")} value={value} onChange={(e) => setPick(e.target.value)} options={[{ value: "", label: t("unassigned") }, ...x.reviewers.map((r) => ({ value: r.id, label: r.name }))]} />}
          </Loadable>
        ) : null}
      </div>
    </Dialog>
  );
}
