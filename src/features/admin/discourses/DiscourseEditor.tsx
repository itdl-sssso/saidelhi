"use client";

/* eslint-disable @next/next/no-img-element -- generated blob: preview, not optimisable */

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DISCOURSE_THEMES,
  QUOTES_MAX,
  type AdminDiscourseBlock,
  type AdminDiscourseDetail,
  type DiscoursePatch,
  type DiscourseQuote,
  type GlossaryTerm,
  adminEndpoints,
  approveBlockers,
  glossaryIssues,
  publishBlockers,
  quoteMatches,
} from "@/contract";
import { formatDate, type AppLocale, tx } from "@/lib/format";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { EmptyState } from "@/ui/EmptyState";
import { Icon } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Input";
import { SaveStatus, type SaveState } from "@/ui/SaveStatus";
import { Select } from "@/ui/Select";
import { Tip } from "@/ui/Tip";
import { useToast } from "@/ui/Toast";
import { renderQuoteImage, shareOrDownload } from "@/features/discourses/quote-image";
import { Note, Loadable } from "../parts";
import { PageHead, Panel } from "../kit";
import { type Result, fx, get, useDisc, useDiscMutate } from "./api";
import { BlockPill, StatusPill } from "./shared";
import styles from "../Admin.module.css";
import d from "./Discourses.module.css";

type Action = "ai-draft" | "send-review" | "approve" | "publish" | "unpublish";
type Body = Omit<DiscoursePatch, "version">;

export function DiscourseEditor({ id }: { id: string }) {
  const api = useDisc<AdminDiscourseDetail>(id, (l) => get(adminEndpoints.discourse(id), l, () => fx.detail(id)));
  const gl = useDisc<GlossaryTerm[]>(id, (l) => get(adminEndpoints.discourseGlossary(), l, () => fx.glossary()));
  return (
    <div className={styles.page}>
      <Loadable api={api} rows={8}>
        {(det) => <Editor key={det.version} initial={det} glossary={gl.status === "ready" ? gl.data : null} reload={api.reload} />}
      </Loadable>
    </div>
  );
}

function Editor({ initial, glossary, reload }: { initial: AdminDiscourseDetail; glossary: GlossaryTerm[] | null; reload: () => void }) {
  const t = useTranslations("admin.discourses");
  const locale = useLocale() as AppLocale;
  const toast = useToast();
  const { run, pending } = useDiscMutate(reload);
  const [det, setDet] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [save, setSave] = useState<SaveState>("sent");
  const verRef = useRef(initial.version);
  const draftsRef = useRef(drafts);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pick, setPick] = useState<{ blockId: string; text: string } | null>(null);
  const [preview, setPreview] = useState<{ q: DiscourseQuote; lang: "en" | "hi" } | null>(null);
  const [reviewerPick, setReviewerPick] = useState("");
  const { can } = det;

  const setDraftMap = (next: Record<string, string>) => {
    draftsRef.current = next;
    setDrafts(next);
  };

  /** Serialised PATCH so versions never race. Returns the result (or null when nothing to send). */
  const patch = useCallback(
    (body: Body, after?: (data: AdminDiscourseDetail) => void): Promise<Result<AdminDiscourseDetail>> => {
      const job = chain.current.then(async () => {
        setSave("sending");
        const full: DiscoursePatch = { ...body, version: verRef.current };
        const res = await run<AdminDiscourseDetail>(adminEndpoints.discourse(det.id), "PATCH", full, () => fx.patch(det.id, full), { key: "patch", quiet: true });
        if (res.ok) {
          verRef.current = res.data.version;
          setDet(res.data);
          setSave("sent");
          after?.(res.data);
        } else {
          setSave("error");
          if (res.status === 422) toast.show({ tone: "error", message: Object.values(res.error.fields ?? {})[0] ?? res.error.message });
        }
        return res;
      });
      chain.current = job.catch(() => undefined);
      return job;
    },
    [det.id, run, toast],
  );

  const flush = useCallback((): Promise<unknown> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const sent = { ...draftsRef.current };
    const ids = Object.keys(sent);
    if (ids.length === 0) return chain.current;
    return patch({ blocks: ids.map((bid) => ({ id: bid, hi: sent[bid] === "" ? null : sent[bid] })) }, () => {
      const left = { ...draftsRef.current };
      for (const bid of ids) if (left[bid] === sent[bid]) delete left[bid];
      setDraftMap(left);
    });
  }, [patch]);

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  // Selection inside an English block feeds the quote picker (touch selection handles fire selectionchange only).
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.anchorNode || !sel.focusNode) return;
      const own = (n: Node) => (n instanceof Element ? n : n.parentElement)?.closest<HTMLElement>("[data-en-block]") ?? null;
      const a = own(sel.anchorNode);
      const b = own(sel.focusNode);
      if (!a || a !== b) return;
      const text = sel.toString().replace(/\s+/g, " ").trim();
      if (text) setPick({ blockId: a.dataset.enBlock ?? "", text });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  const onType = (bid: string, value: string) => {
    setDraftMap({ ...draftsRef.current, [bid]: value });
    setSave("local");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 900);
  };

  const hiOf = (b: AdminDiscourseBlock) => drafts[b.id] ?? b.hi ?? "";
  const issuesOf = (b: AdminDiscourseBlock) => (drafts[b.id] !== undefined && glossary ? glossaryIssues(b.en, drafts[b.id] || null, glossary) : b.glossaryIssues);
  const effStatus = (b: AdminDiscourseBlock) => (drafts[b.id] !== undefined ? (drafts[b.id] ? ("edited" as const) : ("empty" as const)) : b.status);

  const approveBlock = async (b: AdminDiscourseBlock) => {
    const hi = drafts[b.id];
    await patch({ blocks: [{ id: b.id, ...(hi !== undefined ? { hi: hi || null } : {}), status: "approved" }] }, () => {
      if (hi === undefined) return;
      const left = { ...draftsRef.current };
      if (left[b.id] === hi) delete left[b.id];
      setDraftMap(left);
    });
  };

  const act = async (action: Action, extra: { reviewerId?: string; blockIds?: string[] } = {}) => {
    await flush();
    const body = { version: verRef.current, ...extra };
    const res = await run<AdminDiscourseDetail>(adminEndpoints.discourseAction(det.id, action), "POST", body, () => fx.action(det.id, action, body), { key: action, quiet: true });
    if (res.ok) {
      verRef.current = res.data.version;
      setDet(res.data);
      toast.show({ tone: "success", message: t(`done.${action}`) });
    } else if (res.status === 422) {
      const keys = Object.keys(res.error.fields ?? {});
      const map: Record<string, string> = { blocks: "tipApproveBlocks", quotes: "tipApproveQuotes", flag_off: "tipPublishFlag", not_approved: "tipPublishApproved", reviewerId: "reviewerNeeded" };
      toast.show({ tone: "error", message: keys[0] && map[keys[0]] ? t(map[keys[0]] as "tipApproveBlocks") : (Object.values(res.error.fields ?? {})[0] ?? res.error.message) });
    }
  };

  const focusRel = (idx: number, dir: 1 | -1) => {
    const next = det.blocks[idx + dir];
    if (!next) return;
    const el = document.getElementById(`hi-${next.id}`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const addQuote = () => {
    if (!pick) return;
    const q: DiscourseQuote = { en: pick.text, hi: null, blockId: pick.blockId };
    if (det.quotes.length >= QUOTES_MAX) return void toast.show({ tone: "error", message: t("quoteMax") });
    if (det.quotes.some((x) => x.blockId === q.blockId && x.en === q.en)) return void toast.show({ tone: "error", message: t("quoteDup") });
    if (!quoteMatches(q, det.blocks)) return void toast.show({ tone: "error", message: t("quotesHelp") });
    void patch({ quotes: [...det.quotes, q] }, () => setPick(null));
    window.getSelection()?.removeAllRanges();
  };
  const setQuotes = (quotes: DiscourseQuote[]) => void patch({ quotes });

  const effBlocks = det.blocks.map((b) => ({ status: effStatus(b) }));
  const aBlock = approveBlockers({ blocks: effBlocks, quotes: det.quotes });
  const pBlock = publishBlockers(det.status, det.flagOn);
  const aTip = aBlock.map((k) => t(k === "blocks" ? "tipApproveBlocks" : "tipApproveQuotes")).join(" ");
  const pTip = pBlock.map((k) => t(k === "flag_off" ? "tipPublishFlag" : "tipPublishApproved")).join(" ");
  const hasEmptyAi = det.blocks.some((b) => b.hasAiDraft && b.status === "empty" && drafts[b.id] === undefined);
  const dirty = Object.keys(drafts).length > 0;
  const saveLabel = save === "sending" ? t("saving") : save === "error" ? t("saveError") : save === "local" || dirty ? t("unsaved") : t("saved");
  const reviewerValue = reviewerPick || det.reviewer?.id || "";
  const locked = !can.edit;
  const title = tx(det.title, locale) || det.title.en;

  return (
    <>
      <PageHead
        back={{ href: "/admin/discourses", label: t("backList") }}
        eyebrow={
          <span className={styles.row}>
            <StatusPill status={det.status} />
            <span className={styles.cap}>#{det.n}</span>
          </span>
        }
        title={title}
        sub={`${det.meta.collPrint} · ${det.meta.date}`}
      />
      {det.flagOn ? null : <Note icon="eye-off">{t("flagOff")}</Note>}
      {locked ? <Note icon="lock">{t("readOnly")}</Note> : null}
      <Panel>
        <div className={d.workflow}>
          {can.edit && hasEmptyAi ? (
            <Button variant="secondary" icon="sparkles" pending={pending === "ai-draft"} onClick={() => act("ai-draft")}>
              {t("aiDraftAll")}
            </Button>
          ) : null}
          {can.review ? (
            <Select className={d.reviewerSel} label={t("reviewer")} value={reviewerValue} onChange={(e) => setReviewerPick(e.target.value)} options={[{ value: "", label: t("chooseReviewer") }, ...det.reviewers.map((r) => ({ value: r.id, label: r.name }))]} />
          ) : det.reviewer ? (
            <span className={styles.cap}>
              {t("reviewer")}: {det.reviewer.name}
            </span>
          ) : null}
          {can.edit ? (
            <Button variant="secondary" icon="send" disabled={!reviewerValue} pending={pending === "send-review"} onClick={() => act("send-review", { reviewerId: reviewerValue })}>
              {t("sendReview")}
            </Button>
          ) : null}
          {can.review ? (
            aBlock.length ? (
              <Tip tip={aTip}>
                <Button variant="secondary" icon="badge-check" disabled aria-disabled>
                  {t("approve")}
                </Button>
              </Tip>
            ) : (
              <Button variant="secondary" icon="badge-check" disabled={det.status === "approved" || det.status === "published"} pending={pending === "approve"} onClick={() => act("approve")}>
                {t("approve")}
              </Button>
            )
          ) : null}
          {can.publish ? (
            det.status === "published" ? (
              <Button variant="outline" icon="eye-off" pending={pending === "unpublish"} onClick={() => act("unpublish")}>
                {t("unpublish")}
              </Button>
            ) : pBlock.length ? (
              <Tip tip={pTip}>
                <Button icon="globe" disabled aria-disabled>
                  {t("publish")}
                </Button>
              </Tip>
            ) : (
              <Button icon="globe" pending={pending === "publish"} onClick={() => act("publish")}>
                {t("publish")}
              </Button>
            )
          ) : null}
          <span className={d.workflowEnd}>
            <SaveStatus state={dirty && save === "sent" ? "local" : save}>{saveLabel}</SaveStatus>
          </span>
        </div>
        {det.publishedAt ? <p className={styles.cap}>{t("publishedOn", { date: formatDate(det.publishedAt, locale) })}</p> : null}
      </Panel>

      <div className={d.layout}>
        <div className={d.rows}>
          <p className={styles.cap}>{t("kbHint")}</p>
          {det.blocks.length === 0 ? <EmptyState icon="file-text" title={t("empty2")} /> : null}
          {det.blocks.map((b, i) => {
            const issues = issuesOf(b);
            const st = effStatus(b);
            const hi = hiOf(b);
            return (
              <article key={b.id} className={`${d.blk} ${st === "approved" ? d.blkApproved : ""}`} aria-label={t("paragraph", { n: b.idx })}>
                <div className={d.blkNo}>
                  <span>{b.idx}</span>
                </div>
                <div className={d.cell}>
                  <span className={d.cellLabel}>
                    {t("enLabel")} · {t(`blockType.${b.type}`)}
                  </span>
                  <p className={`${d.en} ${b.type === "heading" ? d.enHeading : ""} ${b.type === "poem" ? d.enPoem : ""}`} data-en-block={b.id} lang="en">
                    {b.en}
                  </p>
                </div>
                <div className={d.cell}>
                  <label className={d.cellLabel} htmlFor={`hi-${b.id}`}>
                    {t("hiLabel")} · {t("paragraph", { n: b.idx })}
                  </label>
                  <textarea
                    id={`hi-${b.id}`}
                    lang="hi"
                    className={d.hiArea}
                    value={hi}
                    readOnly={locked}
                    placeholder={t("hiPlaceholder")}
                    rows={Math.max(3, Math.min(14, Math.ceil(b.en.length / 70)))}
                    onChange={(e) => onType(b.id, e.target.value)}
                    onBlur={() => void flush()}
                    onKeyDown={(e) => {
                      if (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                        e.preventDefault();
                        focusRel(i, e.key === "ArrowDown" ? 1 : -1);
                      }
                    }}
                    aria-describedby={issues.length ? `gl-${b.id}` : undefined}
                  />
                  {issues.length ? (
                    <ul id={`gl-${b.id}`} className={d.warn}>
                      {issues.map((g) => (
                        <li key={g.term}>
                          <Icon name="triangle-alert" size={16} />
                          <span>{t("glossWarn", { term: g.term, expected: g.expected })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className={d.blkFoot}>
                    <BlockPill status={st} />
                    {can.edit && b.hasAiDraft && st === "empty" ? (
                      <Button size="sm" variant="quiet" icon="sparkles" onClick={() => act("ai-draft", { blockIds: [b.id] })}>
                        {t("restoreBlock")}
                      </Button>
                    ) : null}
                    {can.review && st !== "approved" ? (
                      hi.trim() ? (
                        <Button size="sm" variant="secondary" icon="check" onClick={() => approveBlock(b)}>
                          {t("approveBlock")}
                        </Button>
                      ) : (
                        <Tip tip={t("needHi")}>
                          <Button size="sm" variant="secondary" icon="check" disabled aria-disabled>
                            {t("approveBlock")}
                          </Button>
                        </Tip>
                      )
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className={d.side} aria-label={t("details")}>
          <Panel title={t("quotes")} badge={<span className={styles.cap}>{t("quotesCount", { n: det.quotes.length })}</span>}>
            <p className={styles.cap}>{t("quotesHelp")}</p>
            {det.quotes.length === 0 ? <p className={styles.cap}>{t("quoteEmpty")}</p> : null}
            {det.quotes.map((q, i) => (
              <QuoteItem key={`${q.blockId}-${i}-${q.en}`} q={q} idx={i} locked={locked} onChangeHi={(hi) => setQuotes(det.quotes.map((x, j) => (j === i ? { ...x, hi: hi || null } : x)))} onRemove={() => setQuotes(det.quotes.filter((_, j) => j !== i))} onPreview={(lang) => setPreview({ q, lang })} />
            ))}
          </Panel>
          <Panel title={t("details")}>
            <dl className={d.dl}>
              <dt>{t("collection")}</dt>
              <dd>
                {det.meta.collPrint}
                {det.meta.collOnline ? ` · ${det.meta.collOnline}` : ""}
              </dd>
              <dt>{t("date")}</dt>
              <dd>{det.meta.date}</dd>
              <dt>{t("place")}</dt>
              <dd>{det.meta.place}</dd>
              <dt>{t("occasion")}</dt>
              <dd>{det.meta.occasion}</dd>
              {det.meta.sourceUrl ? (
                <>
                  <dt>{t("source")}</dt>
                  <dd>
                    <a href={det.meta.sourceUrl} target="_blank" rel="noreferrer" className={styles.textLink}>
                      {det.meta.sourceUrl}
                    </a>
                  </dd>
                </>
              ) : null}
              <dt>{t("themes")}</dt>
              <dd>
                <span className={d.chips}>
                  {det.themes.map((k) => (
                    <span key={k} className={d.chip}>
                      {tx(DISCOURSE_THEMES[k].label, locale)}
                    </span>
                  ))}
                </span>
              </dd>
            </dl>
            <TextSave key={`t${det.version}`} label={t("titleHi")} value={det.title.hi ?? ""} readOnly={locked} onSave={(v) => void patch({ title: { en: det.title.en, hi: v || null } })} />
            <TextSave key={`w${det.version}`} label={t("whyHi")} hint={det.why.en} value={det.why.hi ?? ""} readOnly={locked} onSave={(v) => void patch({ why: { en: det.why.en, hi: v || null } })} />
          </Panel>
          {det.notes.length ? (
            <Panel title={t("notes")}>
              <ul className={d.warn} style={{ color: "inherit" }}>
                {det.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>

      {pick && can.edit ? (
        <div className={d.pickBar} role="region" aria-label={t("quoteSelected")}>
          <span className={d.pickText}>“{pick.text}”</span>
          <Button size="sm" icon="quote" onClick={addQuote} disabled={det.quotes.length >= QUOTES_MAX}>
            {t("quoteMake")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPick(null)}>
            {t("close")}
          </Button>
        </div>
      ) : null}
      <PreviewDialog preview={preview} source={`${det.meta.collPrint} · ${det.meta.date}`} slug={det.slug} onClose={() => setPreview(null)} />
    </>
  );
}

function TextSave({ label, hint, value, readOnly, onSave }: { label: string; hint?: string; value: string; readOnly: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return <Input label={label} hint={hint} lang="hi" value={v} readOnly={readOnly} maxLength={300} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v.trim())} />;
}

function QuoteItem({ q, idx, locked, onChangeHi, onRemove, onPreview }: { q: DiscourseQuote; idx: number; locked: boolean; onChangeHi: (hi: string) => void; onRemove: () => void; onPreview: (lang: "en" | "hi") => void }) {
  const t = useTranslations("admin.discourses");
  const [hi, setHi] = useState(q.hi ?? "");
  return (
    <div className={d.quote}>
      <blockquote lang="en">{q.en}</blockquote>
      <Textarea label={t("quoteHi")} lang="hi" rows={3} value={hi} readOnly={locked} onChange={(e) => setHi(e.target.value)} onBlur={() => hi !== (q.hi ?? "") && onChangeHi(hi.trim())} id={`qhi-${idx}`} />
      <div className={styles.row}>
        <Button size="sm" variant="secondary" icon="image" onClick={() => onPreview("en")}>
          {t("quoteEn")}
        </Button>
        {q.hi ? (
          <Button size="sm" variant="secondary" icon="image" onClick={() => onPreview("hi")}>
            {t("quoteHiBtn")}
          </Button>
        ) : (
          <Tip tip={t("quoteNoHi")}>
            <Button size="sm" variant="secondary" icon="image" disabled aria-disabled>
              {t("quoteHiBtn")}
            </Button>
          </Tip>
        )}
        {locked ? null : (
          <Button size="sm" variant="ghost" icon="trash-2" onClick={onRemove}>
            {t("quoteRemove")}
          </Button>
        )}
      </div>
    </div>
  );
}

function PreviewDialog({ preview, source, slug, onClose }: { preview: { q: DiscourseQuote; lang: "en" | "hi" } | null; source: string; slug: string; onClose: () => void }) {
  const t = useTranslations("admin.discourses");
  const [img, setImg] = useState<{ url: string; blob: Blob; for: unknown } | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  useEffect(() => {
    if (!preview) return;
    let live = true;
    let url = "";
    const text = preview.lang === "hi" ? (preview.q.hi ?? "") : preview.q.en;
    void renderQuoteImage({ text, lang: preview.lang, attribution: t(preview.lang === "hi" ? "attrHi" : "attrEn"), source, footer: t("footer") })
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setImg({ url, blob, for: preview });
      })
      .catch(() => live && setFailed(preview));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, source, t]);
  const ready = preview && img && img.for === preview ? img : null;
  const bad = preview && failed === preview;
  return (
    <Dialog
      open={preview !== null}
      onClose={onClose}
      title={t("previewTitle")}
      width={560}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
          <Button icon="share-2" disabled={!ready} onClick={() => ready && preview && void shareOrDownload(ready.blob, `${slug}-${preview.lang}.png`, preview.q.en)}>
            {t("shareImage")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        {bad ? <p role="alert">{t("previewFail")}</p> : ready ? <img className={d.preview} src={ready.url} alt={preview?.lang === "hi" ? (preview.q.hi ?? "") : (preview?.q.en ?? "")} /> : <p className={styles.cap}>{t("saving")}</p>}
      </div>
    </Dialog>
  );
}
