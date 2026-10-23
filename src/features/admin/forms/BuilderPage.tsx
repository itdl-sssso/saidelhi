"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FormDefinition, type FormField, type FormTemplateDetail, type FormTestResult, adminEndpoints, builderChecks, canPublish, missingHindi } from "@/contract";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type AppLocale, tx } from "@/lib/format";
import { portalRequest } from "@/lib/portal-api";
import { Alert } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Icon } from "@/ui/Icon";
import { useToast } from "@/ui/Toast";
import { PageHead, Pill } from "../kit";
import { Loadable } from "../parts";
import { useApi } from "../useApi";
import { BuilderDrawer } from "./BuilderDrawer";
import { Canvas, Palette, type Selection } from "./BuilderCanvas";
import { FieldSettings, SectionSettings } from "./FieldSettings";
import { PreviewDialog, PhonePreview, FormFill } from "./FormPreview";
import { type Kind, addField, flatFields, newField, newSection, moveItem, removeField, reorderFields } from "./builder-model";
import styles from "../Admin.module.css";
import s from "./Builder.module.css";

export function BuilderPage({ id }: { id: string }) {
  const api = useApi<FormTemplateDetail>(adminEndpoints.form(id));
  return (
    <div className={styles.page}>
      <Loadable api={api} rows={6}>{(d) => <Builder key={`${d.template.id}-${d.template.current?.version ?? 0}`} detail={d} reload={api.reload} />}</Loadable>
    </div>
  );
}

type SaveState = "saved" | "dirty" | "saving" | "conflict" | "error";

function Builder({ detail, reload }: { detail: FormTemplateDetail; reload: () => void }) {
  const t = useTranslations("admin.builder");
  const tForms = useTranslations("admin.forms");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const tpl = detail.template;
  const readOnly = !detail.can.edit;

  const [def, setDef] = useState<FormDefinition>(() => detail.draft ?? detail.published!);
  const [version, setVersion] = useState<number | null>(detail.version);
  const [sel, setSel] = useState<Selection>(null);
  const [target, setTarget] = useState<string>(() => (detail.draft ?? detail.published!).sections.at(-1)?.id ?? "");
  const [save, setSave] = useState<SaveState>("saved");
  const [dlg, setDlg] = useState<null | "preview" | "test" | "publish" | { kind: "kpi"; field: FormField }>(null);
  const [publishing, setPublishing] = useState(false);

  const publishedIds = useMemo(() => new Set(detail.published ? flatFields(detail.published).map((x) => x.f.id) : []), [detail.published]);
  const purpose = tpl.purpose;
  const checks = useMemo(() => builderChecks(def, { purpose }), [def, purpose]);
  const hiList = useMemo(() => missingHindi(def), [def]);
  const hiMissing = useMemo(() => new Set(hiList), [hiList]);
  const errorIds = useMemo(() => new Set(checks.filter((c) => !c.ok && c.level === "error").flatMap((c) => c.fieldIds)), [checks]);
  const publishable = canPublish(checks);
  const hiFieldCount = hiList.filter((x) => !x.startsWith("section:")).length;

  // ---- autosave (debounced PATCH with the draft version; 409 → reload banner) ----
  const latest = useRef(def);
  const seq = useRef(0);
  const versionRef = useRef(version);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const doSave = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    setSave("saving");
    let end: SaveState = "saved";
    for (;;) {
      const mine = seq.current;
      const res = await portalRequest<FormTemplateDetail>(adminEndpoints.form(tpl.id), { method: "PATCH", body: { definition: latest.current, version: versionRef.current }, locale });
      if (res.ok) {
        versionRef.current = res.data.version;
        setVersion(res.data.version);
        if (seq.current !== mine) continue;
        break;
      }
      if (res.status === 409) end = "conflict";
      else {
        end = "error";
        if (res.status === 401) router.push({ pathname: "/admin/login", query: { next: pathname } });
      }
      break;
    }
    inflight.current = false;
    setSave(end);
  }, [tpl.id, locale, router, pathname]);

  const change = useCallback(
    (next: FormDefinition) => {
      if (readOnly) return;
      latest.current = next;
      seq.current += 1;
      setDef(next);
      setSave("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void doSave(), 1200);
    },
    [doSave, readOnly],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  useEffect(() => {
    if (save !== "dirty" && save !== "saving") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save]);

  // ---- editing ----
  const selectedField = sel?.kind === "field" ? flatFields(def).find((x) => x.f.id === sel.id)?.f : undefined;
  const selectedSection = sel?.kind === "section" ? def.sections.find((x) => x.id === sel.id) : undefined;

  const add = (kind: Kind) => {
    const f = newField(kind, new Set(flatFields(def).map((x) => x.f.id)));
    const sec = def.sections.find((x) => x.id === target) ?? def.sections.at(-1);
    if (!sec) return;
    change(addField(def, sec.id, f));
    setSel({ kind: "field", id: f.id });
  };
  const addChild = (sectionId: string, parent: FormField, kind: Kind) => {
    const f = newField(kind, new Set(flatFields(def).map((x) => x.f.id)));
    change(addField(def, sectionId, f, parent.id));
    setSel({ kind: "field", id: f.id });
  };
  const doRemove = (f: FormField) => {
    change(removeField(def, f.id));
    if (sel?.kind === "field" && sel.id === f.id) setSel(null);
  };
  const askRemove = (f: FormField) => {
    const hasKpi = f.kpi || (f.fields ?? []).some((c) => c.kpi);
    if (hasKpi) setDlg({ kind: "kpi", field: f });
    else doRemove(f);
  };
  const pickField = (id: string) => {
    setSel({ kind: "field", id });
    document.getElementById("builder-settings")?.scrollIntoView({ block: "nearest" });
  };

  const addSection = () => {
    const sec = newSection(def);
    change({ ...def, sections: [...def.sections, sec] });
    setSel({ kind: "section", id: sec.id });
    setTarget(sec.id);
  };

  // ---- publish ----
  const publish = async () => {
    if (version === null) return;
    setPublishing(true);
    const res = await portalRequest<FormTemplateDetail>(adminEndpoints.formAction(tpl.id, "publish"), { body: { version }, locale });
    setPublishing(false);
    if (res.ok) {
      toast.show({ tone: "success", message: t("published", { n: res.data.template.current?.version ?? 0 }) });
      setDlg(null);
      reload();
    } else if (res.status === 409) setSave("conflict");
    else toast.show({ tone: "error", message: Object.values(res.error.fields ?? {})[0] ?? res.error.message });
  };

  const blockedReason = (() => {
    if (readOnly) return t("readOnly");
    if (save === "saving" || save === "dirty") return t("savingFirst");
    if (version === null) return t("nothingToPublish");
    if (!checks.find((c) => c.key === "hi_labels")?.ok) return t("blockedHi", { count: Math.max(hiList.length, 1) });
    const bad = checks.find((c) => !c.ok && c.level === "error");
    return bad ? t(`check.${bad.key}.title`) : null;
  })();
  const canPublishNow = !blockedReason && publishable && version !== null && save === "saved";

  const title = tx(tpl.title, locale);
  const draftN = tpl.draft?.version ?? (tpl.current ? tpl.current.version + 1 : 1);

  return (
    <>
      <PageHead back={{ href: "/admin/forms", label: tForms("title") }} eyebrow={t("eyebrow")} title={title} />
      <div className={s.top}>
        <div className={s.topBadges}>
          <Pill tone="blue">{version !== null || tpl.draft ? t("draftOf", { n: draftN }) : t("viewing", { n: tpl.current?.version ?? 1 })}</Pill>
          {hiFieldCount > 0 || hiMissing.size > 0 ? <Pill tone="yellow" icon="languages">{t("hiShort", { count: hiMissing.size })}</Pill> : <Pill tone="green" icon="circle-check">{t("hiDone")}</Pill>}
          <span className={s.save} role="status" aria-live="polite">
            <Icon name={save === "saved" ? "circle-check" : save === "conflict" || save === "error" ? "triangle-alert" : "loader-circle"} size={16} />
            {t(`save.${save}`)}
          </span>
        </div>
        <div className={s.topR}>
          <Button variant="outline" icon="eye" onClick={() => setDlg("preview")}>
            {t("preview")}
          </Button>
          {!readOnly ? (
            <span className={s.deskInline}>
              <Button variant="outline" onClick={() => setDlg("test")} disabled={save !== "saved"}>
                {t("test")}
              </Button>
              <Button disabled={!canPublishNow} onClick={() => setDlg("publish")}>
                {t("publish")}
              </Button>
            </span>
          ) : null}
        </div>
      </div>
      {!readOnly && blockedReason && save !== "saved" ? null : !readOnly && blockedReason ? (
        <span className={s.why}>
          <Icon name="circle-alert" size={16} />
          {t("publishBlocked", { reason: blockedReason })}
        </span>
      ) : null}

      {save === "conflict" ? (
        <Alert tone="attention" title={t("conflictTitle")}>
          {t("conflictBody")}{" "}
          <button type="button" className={styles.linkBtn} onClick={reload}>
            {t("reload")}
          </button>
        </Alert>
      ) : null}
      {save === "error" ? <Alert tone="error">{t("saveError")}</Alert> : null}

      <div className={s.phoneOnly}>
        <Alert tone="info" title={t("phoneTitle")}>
          {t("phoneBody")}
        </Alert>
        <div style={{ marginTop: 16 }}>
          <PhonePreview def={def} />
        </div>
      </div>

      <div className={s.deskOnly}>
        <div className={s.cols}>
          <Palette onAdd={add} disabled={readOnly} targetLabel={((locale === "hi" && def.sections.find((x) => x.id === target)?.title.hi) || def.sections.find((x) => x.id === target)?.title.en || t("untitledSection")) as string} />
          <Canvas
            def={def}
            selection={sel}
            onSelect={setSel}
            onReorder={(sec, a, b, parent) => change(reorderFields(def, sec, a, b, parent))}
            onRemove={askRemove}
            onAddChild={addChild}
            onMoveSection={(a, b) => change({ ...def, sections: moveItem(def.sections, a, b) })}
            onAddSection={addSection}
            onSectionTarget={setTarget}
            targetSectionId={target}
            hiMissing={hiMissing}
            errorIds={errorIds}
            readOnly={readOnly}
          />
          <aside className={s.settings} id="builder-settings" aria-label={t("settingsPanel")}>
            <div className={s.setHd}>
              <h2 className={s.setT}>{selectedField ? t("fieldSettings") : selectedSection ? t("sectionSettings") : t("settings")}</h2>
            </div>
            {selectedField ? (
              <FieldSettings key={selectedField.id} def={def} field={selectedField} kpiOptions={detail.kpiOptions} publishedIds={publishedIds} onChange={change} onRemove={askRemove} onIdChange={(to) => setSel({ kind: "field", id: to })} readOnly={readOnly} />
            ) : selectedSection ? (
              <SectionSettings
                key={selectedSection.id}
                def={def}
                section={selectedSection}
                onChange={change}
                readOnly={readOnly}
                onRemove={() => {
                  change({ ...def, sections: def.sections.filter((x) => x.id !== selectedSection.id) });
                  setSel(null);
                }}
              />
            ) : (
              <p className={s.empty}>{t("pickSomething")}</p>
            )}
          </aside>
        </div>
        <BuilderDrawer def={def} purpose={purpose} checks={checks} onPick={pickField} />
      </div>

      <PreviewDialog open={dlg === "preview"} onClose={() => setDlg(null)} def={def} />
      {dlg === "test" ? <TestDialog id={tpl.id} def={def} onClose={() => setDlg(null)} /> : null}
      <Dialog
        open={dlg === "publish"}
        onClose={() => setDlg(null)}
        title={t("publishTitle", { n: draftN })}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("cancel")}
            </Button>
            <Button pending={publishing} onClick={publish}>
              {t("publishConfirm", { n: draftN })}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <p>{t("publishBody", { n: draftN, prev: tpl.current?.version ?? 0 })}</p>
          <p className={styles.cap}>{t("publishRule")}</p>
        </div>
      </Dialog>
      <Dialog
        open={typeof dlg === "object" && dlg !== null}
        onClose={() => setDlg(null)}
        title={t("kpiRemoveTitle")}
        footer={
          <div className={styles.dialogFoot}>
            <Button variant="ghost" onClick={() => setDlg(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (typeof dlg === "object" && dlg) doRemove(dlg.field);
                setDlg(null);
              }}
            >
              {t("kpiRemoveConfirm")}
            </Button>
          </div>
        }
      >
        <div className={styles.dialogBody}>
          <Alert tone="attention">{t("kpiRemoveBody", { kpi: typeof dlg === "object" && dlg ? (dlg.field.kpi ?? (dlg.field.fields ?? []).find((c) => c.kpi)?.kpi ?? "") : "" })}</Alert>
        </div>
      </Dialog>
    </>
  );
}

function TestDialog({ id, def, onClose }: { id: string; def: FormDefinition; onClose: () => void }) {
  const t = useTranslations("admin.builder");
  const locale = useLocale() as AppLocale;
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FormTestResult | null>(null);
  const [failed, setFailed] = useState(false);
  const run = async () => {
    setBusy(true);
    setFailed(false);
    const res = await portalRequest<FormTestResult>(adminEndpoints.formAction(id, "test"), { body: { answers, locale }, locale });
    setBusy(false);
    if (res.ok) setResult(res.data);
    else setFailed(true);
  };
  const name = (key: string) => {
    const f = flatFields(def).find((x) => x.f.id === key.split(".")[0])?.f;
    return (f && ((locale === "hi" && f.label.hi) || f.label.en)) || key;
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("testTitle")}
      width={560}
      footer={
        <div className={styles.dialogFoot}>
          <Button variant="ghost" onClick={onClose}>
            {t("close")}
          </Button>
          <Button pending={busy} onClick={run}>
            {t("testRun")}
          </Button>
        </div>
      }
    >
      <div className={styles.dialogBody}>
        <p className={styles.cap}>{t("testNote")}</p>
        <div className={s.testRes}>
          {result ? (
            <Alert tone={result.ok ? "success" : "error"} title={result.ok ? t("testOk") : t("testBad", { n: Object.keys(result.errors).length })}>
              {Object.entries(result.errors).map(([k, m]) => (
                <div key={k}>
                  {name(k)}: {m}
                </div>
              ))}
              {Object.entries(result.warnings).map(([k, m]) => (
                <div key={k}>
                  {t("warning")} · {name(k)}: {m}
                </div>
              ))}
              {result.ok && result.kpis.length > 0 ? (
                <ul className={s.kpiList}>
                  {result.kpis.map((k, i) => (
                    <li key={i}>
                      {k.key}
                      {k.dim ? ` (${k.dim})` : ""}: {k.value}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Alert>
          ) : null}
          {failed ? <Alert tone="error">{t("testFailed")}</Alert> : null}
        </div>
        <FormFill def={def} lang={locale} answers={answers} setAnswers={setAnswers} />
      </div>
    </Dialog>
  );
}
