"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArticleCategory, type MigrationRun, type MigrationSource, type MigrationTypeRow, adminEndpoints } from "@/contract";
import { Link } from "@/i18n/navigation";
import { formatDate, type AppLocale } from "@/lib/format";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { Select } from "@/ui/Select";
import { Stepper } from "@/ui/Stepper";
import { download } from "../download";
import { PageHead, Panel, Pill } from "../kit";
import { formatNumber } from "../num";
import { useAction } from "../useAction";
import { useApi } from "../useApi";
import { useUpload } from "../useUpload";
import { LinkTabs, Loadable, Note } from "../parts";
import { RedirectsTab } from "./RedirectsTab";
import styles from "../Admin.module.css";
import p from "../Parts.module.css";

const TARGETS: string[] = [...ArticleCategory.options, "skip", "hidden", "redirect_only"];
const TABS = ["import", "redirects"] as const;
type Tab = (typeof TABS)[number];
const STEPS = ["source", "map", "preview", "import", "report"] as const;
type Step = (typeof STEPS)[number];

export function MigrationPage() {
  const t = useTranslations("admin.migration");
  const sp = useSearchParams();
  const tab: Tab = sp.get("tab") === "redirects" ? "redirects" : "import";
  return (
    <div className={styles.page}>
      <PageHead title={t("title")} sub={t("sub")} />
      <LinkTabs path="/admin/migration" tabs={TABS} current={tab} label={t("tabsLabel")} labels={{ import: t("tabImport"), redirects: t("tabRedirects") }} />
      {tab === "import" ? <ImportTab /> : <RedirectsTab />}
    </div>
  );
}

function ImportTab() {
  const api = useApi<MigrationRun[]>(adminEndpoints.migrationRuns());
  return <Loadable api={api} rows={4}>{(runs) => <Wizard runs={runs} reload={api.reload} />}</Loadable>;
}

function stepOf(r: MigrationRun | null): Step {
  if (!r) return "source";
  return r.status === "done" || r.status === "failed" || r.status === "importing" ? "report" : "map";
}

function Wizard({ runs, reload }: { runs: MigrationRun[]; reload: () => void }) {
  const t = useTranslations("admin.migration");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const current = fresh ? null : (runs.find((r) => r.id === pickedId) ?? runs[0] ?? null);
  const [step, setStep] = useState<Step | null>(null);
  const shown: Step = fresh ? "source" : (step ?? stepOf(current));
  const idx = STEPS.indexOf(shown);
  const goto = (s: Step) => setStep(s);
  return (
    <>
      <Stepper steps={STEPS.map((s) => t(`step.${s}`))} current={idx} label={t("stepsLabel")} />
      {shown === "source" ? (
        <SourceStep
          hasRuns={runs.length > 0}
          onBack={() => setFresh(false)}
          onCreated={(r) => {
            setFresh(false);
            setPickedId(r.id);
            setStep("map");
            reload();
          }}
        />
      ) : current ? (
        <>
          {shown === "map" ? <MapStep run={current} reload={reload} onNext={() => goto("preview")} /> : null}
          {shown === "preview" ? <PreviewStep run={current} onBack={() => goto("map")} onDone={() => { goto("report"); reload(); }} /> : null}
          {shown === "import" || shown === "report" ? <ReportStep run={current} onNew={() => { setFresh(true); setStep(null); }} /> : null}
        </>
      ) : null}
    </>
  );
}

function SourceStep({ hasRuns, onBack, onCreated }: { hasRuns: boolean; onBack: () => void; onCreated: (r: MigrationRun) => void }) {
  const t = useTranslations("admin.migration");
  const { run, pending } = useAction();
  const { upload, pending: uploading } = useUpload();
  const [source, setSource] = useState<MigrationSource>("legacy_db");
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const start = async () => {
    setErr(null);
    if (source === "legacy_db") {
      const res = await run<MigrationRun>(adminEndpoints.migrationRuns(), { body: { source } }, { key: "start", refresh: false, quiet422: true });
      if (res.ok) onCreated(res.data);
      else if (res.status === 422) setErr(res.error.message);
      return;
    }
    const f = file.current?.files?.[0];
    if (!f) return setErr(t("errFile"));
    if (!/\.xml$/i.test(f.name) || f.size > 10 * 1024 * 1024) return setErr(t("errFile"));
    const fd = new FormData();
    fd.append("source", "sitemap");
    fd.append("file", f);
    const res = await upload<MigrationRun>(adminEndpoints.migrationRuns(), fd, "start");
    if (res.ok) onCreated(res.data);
    else if (res.status === 422) setErr(res.error.message);
  };
  return (
    <Panel title={t("sourceTitle")}>
      <div className={p.migBody}>
        {err ? <Alert tone="error">{err}</Alert> : null}
        <fieldset className={p.migChoices}>
          <legend className={styles.srOnly}>{t("sourceTitle")}</legend>
          {(["legacy_db", "sitemap"] as const).map((s) => (
            <label key={s} className={p.migChoice} data-on={source === s}>
              <input type="radio" name="source" checked={source === s} onChange={() => setSource(s)} />
              <span>
                <strong>{t(`source.${s}`)}</strong>
                <span className={styles.cap}>{t(`sourceDesc.${s}`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {source === "sitemap" ? (
          <div>
            <input ref={file} type="file" accept=".xml,application/xml,text/xml" onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} aria-label={t("pickFile")} />
            {name ? <span className={styles.cap}> {name}</span> : null}
          </div>
        ) : null}
        <Note icon="info">{t("sourceNote")}</Note>
        <div className={p.migActions}>
          {hasRuns ? (
            <Button variant="ghost" onClick={onBack}>
              {t("cancel")}
            </Button>
          ) : null}
          <Button pending={pending === "start" || uploading === "start"} onClick={start}>
            {t("start")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function MapStep({ run: r, reload, onNext }: { run: MigrationRun; reload: () => void; onNext: () => void }) {
  const t = useTranslations("admin.migration");
  const tc = useTranslations("admin.content");
  const locale = useLocale() as AppLocale;
  const { run, pending } = useAction();
  const [map, setMap] = useState<Record<string, string>>(() => Object.fromEntries(r.types.map((x) => [x.sourceType, x.becomes])));
  const dirty = r.types.some((x) => map[x.sourceType] !== x.becomes);
  const label = (v: string) => (v === "skip" || v === "hidden" || v === "redirect_only" ? t(`target.${v}`) : tc(`cat.${v as ArticleCategory}`));
  const save = async () => {
    const res = await run(adminEndpoints.migrationRun(r.id), { method: "PATCH", body: { types: r.types.map((x) => ({ sourceType: x.sourceType, becomes: map[x.sourceType] })), version: r.version } }, { key: "map", success: t("mapSaved"), onReload: reload });
    if (res.ok) reload();
    return res.ok;
  };
  return (
    <Panel title={t("mapTitle")} flush>
      <div style={{ padding: "var(--space-4)" }}>
        <Note icon="info">{t("mapNote", { when: formatDate(r.startedAt, locale) })}</Note>
      </div>
      {r.types.length === 0 ? (
        <div className={styles.cardBd}>
          <EmptyState icon="newspaper" title={t("mapEmpty")} />
        </div>
      ) : (
        <div className={styles.tblScroll} tabIndex={0}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                <th scope="col">{t("colType")}</th>
                <th scope="col">{t("colItems")}</th>
                <th scope="col">{t("colBecomes")}</th>
              </tr>
            </thead>
            <tbody>
              {r.types.map((x: MigrationTypeRow) => (
                <tr key={x.sourceType}>
                  <td>
                    <span className={styles.tblT}>{x.label}</span>
                    {x.risky ? (
                      <>
                        <br />
                        <Pill tone="yellow" icon="triangle-alert">
                          {t("risky")}
                        </Pill>
                      </>
                    ) : null}
                  </td>
                  <td>{formatNumber(x.items, locale)}</td>
                  <td>
                    <Select label={t("becomesFor", { name: x.label })} value={map[x.sourceType]} onChange={(e) => setMap({ ...map, [x.sourceType]: e.target.value })} options={TARGETS.map((v) => ({ value: v, label: label(v) }))} />
                    {x.risky && map[x.sourceType] !== "skip" && map[x.sourceType] !== "hidden" ? <span className={styles.cap}>{t("riskyHint")}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={`${styles.cardBd} ${p.migActions}`}>
        <Button
          pending={pending === "map"}
          onClick={async () => {
            if (dirty && !(await save())) return;
            onNext();
          }}
        >
          {dirty ? t("saveNext") : t("next")}
        </Button>
      </div>
    </Panel>
  );
}

function Counts({ run: r }: { run: MigrationRun }) {
  const t = useTranslations("admin.migration");
  const locale = useLocale() as AppLocale;
  const tiles: Array<["items" | "imported" | "skipped" | "needsFix" | "redirects", number]> = [
    ["items", r.counts.items],
    ["imported", r.counts.imported],
    ["skipped", r.counts.skipped],
    ["needsFix", r.counts.needsFix],
    ["redirects", r.counts.redirects],
  ];
  return (
    <dl className={p.migTiles}>
      {tiles.map(([k, n]) => (
        <div key={k}>
          <dd>{formatNumber(n, locale)}</dd>
          <dt>{t(`count.${k}`)}</dt>
        </div>
      ))}
    </dl>
  );
}

function IssuesTable({ run: r, limit }: { run: MigrationRun; limit?: number }) {
  const t = useTranslations("admin.migration");
  const rows = limit ? r.issues.slice(0, limit) : r.issues;
  if (rows.length === 0) return <Alert tone="success">{t("noIssues")}</Alert>;
  return (
    <div className={styles.tblScroll} tabIndex={0}>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th scope="col">{t("colItem")}</th>
            <th scope="col">{t("colProblem")}</th>
            <th scope="col">
              <span className={styles.srOnly}>{t("colFix")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={`${i.ref}-${i.problem}`}>
              <td>
                <span className={styles.tblT}>{i.title}</span>
                <br />
                <span className={styles.tblSub}>{i.ref}</span>
              </td>
              <td>
                <Pill tone={i.problem === "personal_data" ? "error" : "yellow"}>{t(`problem.${i.problem}`)}</Pill>
              </td>
              <td>{i.fixPath ? <Link href={i.fixPath} className={styles.linkBtn}>{t("fix")}</Link> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewStep({ run: r, onBack, onDone }: { run: MigrationRun; onBack: () => void; onDone: () => void }) {
  const t = useTranslations("admin.migration");
  const { run, pending } = useAction();
  return (
    <Panel title={t("previewTitle")}>
      <div className={p.migBody}>
        <Counts run={r} />
        <h3 className={styles.cardTitle}>{t("issuesTitle")}</h3>
        <IssuesTable run={r} limit={20} />
        <Note icon="shield-check">{t("importNote")}</Note>
        <div className={p.migActions}>
          <Button variant="ghost" onClick={onBack}>
            {t("back")}
          </Button>
          <Button
            pending={pending === "import"}
            onClick={async () => {
              const res = await run(adminEndpoints.migrationImport(r.id), { body: { version: r.version } }, { key: "import", success: t("imported"), refresh: false });
              if (res.ok) onDone();
            }}
          >
            {t("importNow")}
          </Button>
        </div>
        {pending === "import" ? <p role="status" className={styles.cap}>{t("importing")}</p> : null}
      </div>
    </Panel>
  );
}

function ReportStep({ run: r, onNew }: { run: MigrationRun; onNew: () => void }) {
  const t = useTranslations("admin.migration");
  const locale = useLocale() as AppLocale;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Panel
      title={t("reportTitle")}
      badge={<Pill tone={r.status === "done" ? "green" : r.status === "failed" ? "error" : "yellow"}>{t(`runStatus.${r.status}`)}</Pill>}
      action={
        <Button variant="secondary" size="sm" icon="upload" onClick={onNew}>
          {t("newRun")}
        </Button>
      }
    >
      <div className={p.migBody}>
        <p className={styles.cap}>{t("runInfo", { by: r.by, when: formatDate(r.finishedAt ?? r.startedAt, locale) })}</p>
        {r.status === "failed" ? <Alert tone="error">{t("runFailed")}</Alert> : null}
        {r.status === "importing" ? <Alert tone="info">{t("importing")}</Alert> : null}
        <Counts run={r} />
        <h3 className={styles.cardTitle}>{t("needsFixTitle")}</h3>
        <IssuesTable run={r} />
        {failed ? <Alert tone="error">{t("csvFailed")}</Alert> : null}
        <div className={p.migActions}>
          <Button
            variant="secondary"
            icon="file-text"
            pending={busy}
            onClick={async () => {
              setBusy(true);
              const ok = await download(adminEndpoints.migrationReportCsv(r.id), `migration-${r.id}.csv`);
              setFailed(!ok);
              setBusy(false);
            }}
          >
            {t("csv")}
          </Button>
          <Button variant="secondary" href="/admin/migration?tab=redirects">
            {t("seeRedirects")}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
